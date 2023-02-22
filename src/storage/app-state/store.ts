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

import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/dist/query'

import activeWalletSlice from '@/storage/app-state/slices/activeWalletSlice'
import addressesSlice from '@/storage/app-state/slices/addressesSlice'
import appSlice from '@/storage/app-state/slices/appSlice'
import confirmedTransactionsSlice from '@/storage/app-state/slices/confirmedTransactionsSlice'
import contactsSlice from '@/storage/app-state/slices/contactsSlice'
import networkSlice, { networkListenerMiddleware } from '@/storage/app-state/slices/networkSlice'
import pendingTransactionsSlice from '@/storage/app-state/slices/pendingTransactionsSlice'
import { priceApi } from '@/storage/app-state/slices/priceApiSlice'
import settingsSlice, { settingsListenerMiddleware } from '@/storage/app-state/slices/settingsSlice'
import tokensSlice from '@/storage/app-state/slices/tokensSlice'

export const store = configureStore({
  reducer: {
    [appSlice.name]: appSlice.reducer,
    [activeWalletSlice.name]: activeWalletSlice.reducer,
    [contactsSlice.name]: contactsSlice.reducer,
    [settingsSlice.name]: settingsSlice.reducer,
    [networkSlice.name]: networkSlice.reducer,
    [addressesSlice.name]: addressesSlice.reducer,
    [confirmedTransactionsSlice.name]: confirmedTransactionsSlice.reducer,
    [pendingTransactionsSlice.name]: pendingTransactionsSlice.reducer,
    [tokensSlice.name]: tokensSlice.reducer,
    [priceApi.reducerPath]: priceApi.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(priceApi.middleware)
      .concat(settingsListenerMiddleware.middleware)
      .concat(networkListenerMiddleware.middleware)
})

setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch