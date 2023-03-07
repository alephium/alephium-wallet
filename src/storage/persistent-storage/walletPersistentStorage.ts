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

import { Wallet, walletOpen } from '@alephium/sdk'
import { nanoid } from 'nanoid'

import { StoredWallet, UnencryptedWallet } from '@/types/wallet'

class WalletStorage {
  private static localStorageKey = 'wallet'

  getKey(id: StoredWallet['id']) {
    if (!id) throw new Error('Wallet ID not set.')

    return `${WalletStorage.localStorageKey}-${id}`
  }

  list(): StoredWallet[] {
    const wallets = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)

      if (key?.startsWith(WalletStorage.localStorageKey)) {
        const data = localStorage.getItem(key)

        if (!data) continue

        const wallet = JSON.parse(data) as StoredWallet

        if (!wallet.name) continue

        wallets.push(wallet)
      }
    }

    return wallets
  }

  load(id: StoredWallet['id'], password: string): UnencryptedWallet {
    if (!password) throw new Error(`Unable to load wallet ${id}, password not set.`)

    const data = localStorage.getItem(this.getKey(id))

    if (!data) throw new Error(`Unable to load wallet ${id}, wallet doesn't exist.`)

    const wallet = JSON.parse(data) as StoredWallet

    return {
      name: wallet.name,
      ...walletOpen(password, wallet.encrypted)
    }
  }

  store(name: StoredWallet['name'], password: string, wallet: Wallet): StoredWallet {
    if (!password) throw new Error(`Unable to store wallet ${name}, password not set.`)

    const id = nanoid()

    const dataToStore: StoredWallet = {
      id,
      name,
      encrypted: wallet.encrypt(password)
    }

    localStorage.setItem(this.getKey(id), JSON.stringify(dataToStore))

    return dataToStore
  }

  delete(id: StoredWallet['id']) {
    localStorage.removeItem(this.getKey(id))
  }
}

const Storage = new WalletStorage()

export default Storage
