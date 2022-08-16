/*
Copyright 2018 - 2022 The Alephium Authors
This file is part of the alephium project.

The library is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

The library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with the library. If not, see <http://www.gnu.org/licenses/>.
*/

import { getStorage, getWalletFromMnemonic, Wallet, walletOpen } from '@alephium/sdk'
import { merge } from 'lodash'
import { createContext, FC, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AsyncReturnType, PartialDeep } from 'type-fest'

import { SnackbarMessage } from '../components/SnackbarManager'
import useIdleForTooLong from '../hooks/useIdleForTooLong'
import useLatestGitHubRelease from '../hooks/useLatestGitHubRelease'
import { NetworkStatus } from '../types/network'
import { createClient } from '../utils/api-clients'
import { migrateUserData } from '../utils/migration'
import {
  deprecatedSettingsExist,
  getNetworkName,
  loadSettings,
  migrateDeprecatedSettings,
  NetworkName,
  Settings,
  storeSettings,
  UpdateSettingsFunctionSignature,
  updateStoredSettings
} from '../utils/settings'

let localStorageSettings = loadSettings()

if (deprecatedSettingsExist()) {
  localStorageSettings = migrateDeprecatedSettings()
}

export interface GlobalContextProps {
  walletNames: string[]
  setWalletNames: (names: string[]) => void
  activeWalletName: string
  setCurrentWalletName: (walletName: string) => void
  wallet?: Wallet
  setWallet: (w: Wallet | undefined) => void
  lockWallet: () => void
  login: (walletName: string, password: string, callback: () => void, passphrase?: string) => void
  client: Client | undefined
  settings: Settings
  updateSettings: UpdateSettingsFunctionSignature
  snackbarMessage: SnackbarMessage | undefined
  setSnackbarMessage: (message: SnackbarMessage | undefined) => void
  isClientLoading: boolean
  currentNetwork: NetworkName | 'custom'
  networkStatus: NetworkStatus
  updateNetworkSettings: (settings: Settings['network']) => void
  newLatestVersion: string
  isPassphraseUsed: boolean
}

export type Client = AsyncReturnType<typeof createClient>

export const initialGlobalContext: GlobalContextProps = {
  walletNames: [],
  setWalletNames: () => null,
  activeWalletName: '',
  setCurrentWalletName: () => null,
  wallet: undefined,
  setWallet: () => null,
  lockWallet: () => null,
  login: () => null,
  client: undefined,
  settings: localStorageSettings,
  updateSettings: () => null,
  snackbarMessage: undefined,
  setSnackbarMessage: () => null,
  isClientLoading: false,
  currentNetwork: 'mainnet',
  networkStatus: 'uninitialized',
  updateNetworkSettings: () => null,
  newLatestVersion: '',
  isPassphraseUsed: false
}

export const GlobalContext = createContext<GlobalContextProps>(initialGlobalContext)

const Storage = getStorage()

export const GlobalContextProvider: FC<{ overrideContextValue?: PartialDeep<GlobalContextProps> }> = ({
  children,
  overrideContextValue
}) => {
  const { t } = useTranslation('App')
  const [walletNames, setWalletNames] = useState<string[]>(Storage.list())
  const [wallet, setWallet] = useState<Wallet>()
  const [activeWalletName, setCurrentWalletName] = useState('')
  const [client, setClient] = useState<Client>()
  const [snackbarMessage, setSnackbarMessage] = useState<SnackbarMessage | undefined>()
  const [settings, setSettings] = useState<Settings>(localStorageSettings)
  const [isClientLoading, setIsClientLoading] = useState(false)
  const previousNodeHost = useRef<string>()
  const previousExplorerAPIHost = useRef<string>()
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('uninitialized')
  const [isPassphraseUsed, setIsPassphraseUsed] = useState(false)
  const currentNetwork = getNetworkName(settings.network)
  const newLatestVersion = useLatestGitHubRelease()

  const updateSettings: UpdateSettingsFunctionSignature = (settingKeyToUpdate, newSettings) => {
    const updatedSettings = updateStoredSettings(settingKeyToUpdate, newSettings)
    updatedSettings && setSettings(updatedSettings)
    return updatedSettings
  }

  const updateNetworkSettings = (newNetworkSettings: Settings['network']) => {
    setNetworkStatus('connecting')
    updateSettings('network', newNetworkSettings)
  }

  const lockWallet = () => {
    setCurrentWalletName('')
    setIsPassphraseUsed(false)
    setWallet(undefined)
  }

  const login = async (walletName: string, password: string, callback: () => void, passphrase?: string) => {
    const walletEncrypted = Storage.load(walletName)

    if (!walletEncrypted) {
      setSnackbarMessage({ text: t`Unknown wallet name`, type: 'alert' })
      return
    }

    try {
      let wallet = walletOpen(password, walletEncrypted)

      if (!wallet) return

      if (passphrase) {
        wallet = getWalletFromMnemonic(wallet.mnemonic, passphrase)
      }

      migrateUserData(wallet.mnemonic, walletName)

      setIsPassphraseUsed(!!passphrase)
      setWallet(wallet)
      setCurrentWalletName(walletName)
      callback()
    } catch (e) {
      setSnackbarMessage({ text: t`Invalid password`, type: 'alert' })
    }
  }

  useIdleForTooLong(lockWallet, (settings.general.walletLockTimeInMinutes || 0) * 60 * 1000)

  const getClient = useCallback(async () => {
    setIsClientLoading(true)

    const clientResp = await createClient(settings.network)
    setClient(clientResp)

    if (!clientResp || !settings.network.explorerApiHost || !settings.network.nodeHost) {
      setNetworkStatus('offline')
    } else if (clientResp) {
      setNetworkStatus('online')

      console.log('Clients initialized.')

      setSnackbarMessage({
        text: `${t`Current network`}: ${currentNetwork}.`,
        type: 'info',
        duration: 4000
      })
    }
    setIsClientLoading(false)
  }, [currentNetwork, settings.network, t])

  useEffect(() => {
    const networkSettingsHaveChanged =
      previousNodeHost.current !== settings.network.nodeHost ||
      previousExplorerAPIHost.current !== settings.network.explorerApiHost

    if (networkSettingsHaveChanged) {
      getClient()
      previousNodeHost.current = settings.network.nodeHost
      previousExplorerAPIHost.current = settings.network.explorerApiHost
    }
  }, [currentNetwork, getClient, networkStatus, setSnackbarMessage, settings.network])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (networkStatus === 'offline') {
      interval = setInterval(getClient, 2000)
    }
    return () => clearInterval(interval)
  })

  useEffect(() => {
    if (networkStatus === 'offline') {
      setSnackbarMessage({
        text: t('Could not connect to the {{ currentNetwork }} network.', { currentNetwork }),
        type: 'alert',
        duration: 5000
      })
    }
  }, [currentNetwork, networkStatus, t])

  // Save settings to local storage
  useEffect(() => {
    storeSettings(settings)
  }, [settings])

  return (
    <GlobalContext.Provider
      value={merge(
        {
          walletNames,
          setWalletNames,
          activeWalletName,
          setCurrentWalletName,
          wallet,
          setWallet,
          lockWallet,
          login,
          client,
          snackbarMessage,
          setSnackbarMessage,
          settings,
          updateSettings,
          isClientLoading,
          currentNetwork,
          networkStatus,
          updateNetworkSettings,
          newLatestVersion,
          isPassphraseUsed
        },
        overrideContextValue as GlobalContextProps
      )}
    >
      {children}
    </GlobalContext.Provider>
  )
}

export const useGlobalContext = () => useContext(GlobalContext)
