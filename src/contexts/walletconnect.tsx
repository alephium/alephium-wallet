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

import WalletConnectClient, { CLIENT_EVENTS } from '@walletconnect/client'
import { SessionTypes } from '@walletconnect/types'
import { SignDeployContractTxParams, SignExecuteScriptTxParams, SignTransferTxParams } from 'alephium-web3'
import { createContext, FC, useCallback, useContext, useEffect, useState } from 'react'

import { useAddressesContext } from '../contexts/addresses'
import { BuildDeployContractTxData } from '../modals/SendModal/BuildDeployContractTx'
import { BuildScriptTxData } from '../modals/SendModal/BuildScriptTx'
import { BuildTransferTxData } from '../modals/SendModal/BuildTransferTx'
import { extractErrorMsg } from '../utils/misc'
import { SendTxModalType, useSendTransactionModalContext } from './sendTransactionModal'

type DappTxData = BuildTransferTxData | BuildDeployContractTxData | BuildScriptTxData

interface WalletConnectContextProps {
  walletConnectClient?: WalletConnectClient
  dappTxData?: DappTxData
  requestEvent?: SessionTypes.RequestEvent
  onError: (error: string) => void
}

const initialContext: WalletConnectContextProps = {
  walletConnectClient: undefined,
  dappTxData: undefined,
  requestEvent: undefined,
  onError: () => null
}

type TxDataToModalType =
  | {
      modalType: SendTxModalType.TRANSFER
      txData: BuildTransferTxData
    }
  | {
      modalType: SendTxModalType.DEPLOY_CONTRACT
      txData: BuildDeployContractTxData
    }
  | {
      modalType: SendTxModalType.SCRIPT
      txData: BuildScriptTxData
    }

const WalletConnectContext = createContext<WalletConnectContextProps>(initialContext)

const respondError = (walletConnect: WalletConnectClient, requestEvent: SessionTypes.RequestEvent, error: string) => {
  walletConnect.respond({
    topic: requestEvent.topic,
    response: {
      id: requestEvent.request.id,
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: error
      }
    }
  })
}

export const WalletConnectContextProvider: FC = ({ children }) => {
  const { openSendTxModal } = useSendTransactionModalContext()
  const { addresses } = useAddressesContext()
  const [walletConnectClient, setWalletConnectClient] = useState<WalletConnectClient>()
  const [dappTxData, setDappTxData] = useState<DappTxData>()
  const [requestEvent, setRequestEvent] = useState<SessionTypes.RequestEvent>()

  const onError = useCallback(
    (error: string): void => {
      if (walletConnectClient && requestEvent) {
        respondError(walletConnectClient, requestEvent, error)
      }
    },
    [walletConnectClient, requestEvent]
  )

  useEffect(() => {
    const setTxDataAndOpenModal = ({ txData, modalType }: TxDataToModalType) => {
      setDappTxData(txData)
      openSendTxModal(modalType)
    }

    if (walletConnectClient === undefined) {
      WalletConnectClient.init({
        controller: true,

        // TODO: add as an advanced settings option "WalletConnect Project Id"
        projectId: '6e2562e43678dd68a9070a62b6d52207',
        relayUrl: 'wss://relay.walletconnect.com',
        metadata: {
          name: 'Alephium desktop wallet',
          description: 'Alephium desktop wallet',
          url: 'https://github.com/alephium/desktop-wallet/releases',
          icons: ['https://alephium.org/favicon-32x32.png']
        }
      })
        .then((client) => {
          setWalletConnectClient(client)
        })
        .catch((e) => {
          console.error('WalletConnect error')
          console.error(e)
        })
      return
    }

    const extractAddress = (signerAddress: string) => {
      const address = addresses.find((a) => a.hash === signerAddress)
      if (!address) throw new Error(`Unknown signer address: ${signerAddress}`)

      return address
    }

    const onSessionRequest = async (event: SessionTypes.RequestEvent) => {
      const {
        request: { method, params }
      } = event
      setRequestEvent(event)

      try {
        if (method === 'alph_signTransferTx') {
          const p = params as SignTransferTxParams
          const txData: BuildTransferTxData = {
            fromAddress: extractAddress(p.signerAddress),
            toAddress: p.destinations[0].address,
            alphAmount: p.destinations[0].alphAmount,
            gasAmount: p.gasAmount,
            gasPrice: p.gasPrice
          }

          setTxDataAndOpenModal({ txData, modalType: SendTxModalType.TRANSFER })
        } else if (method === 'alph_signContractCreationTx') {
          const p = params as SignDeployContractTxParams
          const txData: BuildDeployContractTxData = {
            fromAddress: extractAddress(p.signerAddress),
            bytecode: p.bytecode,
            initialAlphAmount: p.initialAlphAmount,
            issueTokenAmount: p.issueTokenAmount,
            gasAmount: p.gasAmount,
            gasPrice: p.gasPrice
          }

          setTxDataAndOpenModal({ txData, modalType: SendTxModalType.DEPLOY_CONTRACT })
        } else if (method === 'alph_signScriptTx') {
          const p = params as SignExecuteScriptTxParams
          const txData: BuildScriptTxData = {
            fromAddress: extractAddress(p.signerAddress),
            bytecode: p.bytecode,
            alphAmount: p.alphAmount,
            gasAmount: p.gasAmount,
            gasPrice: p.gasPrice
          }

          setTxDataAndOpenModal({ txData, modalType: SendTxModalType.SCRIPT })
        } else {
          throw new Error(`Unsupported walletconnect request: ${method}`)
        }
      } catch (e) {
        console.warn(e)
        const error = extractErrorMsg(e)
        respondError(walletConnectClient, event, error)
      }
    }

    walletConnectClient.on(CLIENT_EVENTS.session.request, onSessionRequest)

    return () => {
      walletConnectClient.removeListener(CLIENT_EVENTS.session.request, onSessionRequest)
    }
  }, [addresses, openSendTxModal, walletConnectClient])

  return (
    <WalletConnectContext.Provider
      value={{
        requestEvent,
        walletConnectClient,
        dappTxData,
        onError
      }}
    >
      {children}
    </WalletConnectContext.Provider>
  )
}

export const useWalletConnectContext = () => useContext(WalletConnectContext)
