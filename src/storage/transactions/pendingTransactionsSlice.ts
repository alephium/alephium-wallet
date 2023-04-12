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

import { Transaction } from '@alephium/sdk/api/explorer'
import { createSlice, EntityState, PayloadAction } from '@reduxjs/toolkit'
import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'
import { xorWith } from 'lodash'

import {
  syncAddressesData,
  syncAddressTransactionsNextPage,
  syncAllAddressesTransactionsNextPage
} from '@/storage/addresses/addressesActions'
import { RootState } from '@/storage/store'
import PendingTransactionsStorage from '@/storage/transactions/pendingTransactionsPersistentStorage'
import { storedPendingTransactionsLoaded, transactionSent } from '@/storage/transactions/transactionsActions'
import { pendingTransactionsAdapter } from '@/storage/transactions/transactionsAdapters'
import { activeWalletDeleted, walletLocked, walletSwitched } from '@/storage/wallets/walletActions'
import { PendingTransaction } from '@/types/transactions'

type PendingTransactionsState = EntityState<PendingTransaction>

const initialState: PendingTransactionsState = pendingTransactionsAdapter.getInitialState()

const pendingTransactionsSlice = createSlice({
  name: 'pendingTransactions',
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(transactionSent, pendingTransactionsAdapter.addOne)
      .addCase(syncAddressesData.fulfilled, removeTransactions)
      .addCase(syncAddressTransactionsNextPage.fulfilled, removeTransactions)
      .addCase(syncAllAddressesTransactionsNextPage.fulfilled, removeTransactions)
      .addCase(storedPendingTransactionsLoaded, pendingTransactionsAdapter.addMany)
      .addCase(walletLocked, () => initialState)
      .addCase(walletSwitched, () => initialState)
      .addCase(activeWalletDeleted, () => initialState)
  }
})

export default pendingTransactionsSlice

export const pendingTransactionsListenerMiddleware = createListenerMiddleware()

pendingTransactionsListenerMiddleware.startListening({
  matcher: isAnyOf(
    transactionSent,
    syncAddressesData.fulfilled,
    syncAddressTransactionsNextPage.fulfilled,
    syncAllAddressesTransactionsNextPage.fulfilled
  ),
  effect: (_, { getState }) => {
    const state = getState() as RootState
    const transactions = Object.values(state.pendingTransactions.entities) as PendingTransaction[]
    const { id: walletId, mnemonic, isPassphraseUsed } = state.activeWallet

    if (!walletId || !mnemonic || isPassphraseUsed) return

    const encryptionProps = { walletId, mnemonic, isPassphraseUsed }
    const storedTransactions = PendingTransactionsStorage.load(encryptionProps)
    const uniqueTransactions = xorWith(transactions, storedTransactions, (a, b) => a.hash === b.hash)

    if (uniqueTransactions.length > 0) PendingTransactionsStorage.store(transactions, encryptionProps)
  }
})

// Reducers helper functions

const removeTransactions = (
  state: PendingTransactionsState,
  action: PayloadAction<{ transactions: Transaction[] }[] | { transactions: Transaction[] } | undefined>
) => {
  const transactions = Array.isArray(action.payload)
    ? action.payload.flatMap((address) => address.transactions)
    : action.payload?.transactions

  if (transactions && transactions.length > 0) {
    pendingTransactionsAdapter.removeMany(
      state,
      transactions.map((tx) => tx.hash)
    )
  }
}
