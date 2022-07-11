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

import { getStorage } from '@alephium/sdk'

import { Address } from '../contexts/addresses'

const addressesMetadataLocalStorageKeyPrefix = 'addresses-metadata'

export type AddressSettings = {
  isMain: boolean
  label?: string
  color?: string
}

type AddressMetadata = AddressSettings & {
  index: number
}

export const isAddressValid = (address: string) => {
  const match = address.match(/^[1-9A-HJ-NP-Za-km-z]+$/)

  if (match === null) return false

  return match[0] === address && address
}

const constructMetadataKey = (walletName: string) => `${addressesMetadataLocalStorageKeyPrefix}-${walletName}`

export const loadStoredAddressesMetadataOfWallet = (walletName: string): AddressMetadata[] => {
  const data = localStorage.getItem(constructMetadataKey(walletName))

  if (data === null) return []

  return JSON.parse(data)
}

export const storeAddressMetadataOfWallet = (walletName: string, index: number, settings: AddressSettings) => {
  const addressesMetadata = loadStoredAddressesMetadataOfWallet(walletName)
  const existingAddressMetadata = addressesMetadata.find((data: AddressMetadata) => data.index === index)

  if (!existingAddressMetadata) {
    addressesMetadata.push({
      index,
      ...settings
    })
  } else {
    Object.assign(existingAddressMetadata, settings)
  }
  console.log(`🟠 Storing address index ${index} metadata locally`)
  localStorage.setItem(constructMetadataKey(walletName), JSON.stringify(addressesMetadata))
}

export const deleteStoredAddressMetadataOfWallet = (walletName: string) => {
  localStorage.removeItem(constructMetadataKey(walletName))
}

export const sortAddressList = (addresses: Address[]): Address[] =>
  addresses.sort((a, b) => {
    // Always keep main address to the top of the list
    if (a.settings.isMain) return -1
    if (b.settings.isMain) return 1
    return (b.lastUsed ?? 0) - (a.lastUsed ?? 0)
  })

// See https://github.com/alephium/desktop-wallet/issues/236
export const migrateAddressMetadata = () => {
  const Storage = getStorage()
  const walletNames = Storage.list()

  for (const name of walletNames) {
    const deprecatedKey = `${name}-addresses-metadata`
    const data = localStorage.getItem(deprecatedKey)

    if (data) {
      localStorage.setItem(constructMetadataKey(name), data)
      localStorage.removeItem(deprecatedKey)
    }
  }
}
