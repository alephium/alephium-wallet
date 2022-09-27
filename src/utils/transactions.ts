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

import { calAmountDelta, MIN_UTXO_SET_AMOUNT } from '@alephium/sdk'
import { Input, Output, Transaction, UnconfirmedTransaction } from '@alephium/sdk/api/explorer'
import { uniq } from 'lodash'

import { Address, AddressHash, PendingTx } from '../contexts/addresses'
import { NetworkName } from './settings'

type HasTimestamp = { timestamp: number }
type TransactionVariant = Transaction | PendingTx
type IsTransactionVariant<T extends Transaction | PendingTx> = T extends Transaction
  ? Transaction
  : T extends PendingTx
  ? PendingTx
  : never
export type BelongingToAddress<T extends Transaction | PendingTx> = { data: IsTransactionVariant<T>; address: Address }

export const isAmountWithinRange = (amount: bigint, maxAmount: bigint): boolean =>
  amount >= MIN_UTXO_SET_AMOUNT && amount <= maxAmount

export type TransactionDirection = 'out' | 'in'
export type TransactionInfoType = TransactionDirection | 'move' | 'pending'
export type TransactionType = 'consolidation' | 'transfer' | 'sweep'
export type TransactionStatus = 'pending' | 'confirmed'

export const getTransactionsForAddresses = (
  txStatus: TransactionStatus,
  addresses: Address[]
): BelongingToAddress<TransactionVariant>[] =>
  addresses
    .map((address) =>
      address.transactions[txStatus].map((tx) => ({
        data: tx,
        address
      }))
    )
    .flat()
    .sort((a, b) => sortTransactions(a.data, b.data))

export function isExplorerTransaction(tx: TransactionVariant): tx is Transaction {
  const _tx = tx as Transaction
  return (
    (_tx.hash !== undefined &&
      _tx.blockHash !== undefined &&
      _tx.timestamp !== undefined &&
      _tx.gasAmount !== undefined &&
      _tx.gasPrice !== undefined) === true
  )
}
export function isPendingTx(tx: TransactionVariant): tx is PendingTx {
  const _tx = tx as PendingTx
  return (
    (_tx.txId !== undefined &&
      _tx.fromAddress !== undefined &&
      _tx.toAddress !== undefined &&
      _tx.timestamp !== undefined &&
      _tx.type !== undefined &&
      _tx.network !== undefined) === true
  )
}

export function sortTransactions(a: HasTimestamp, b: HasTimestamp): number {
  const delta = b.timestamp - a.timestamp

  // Sent and received in the same block, but will not be in the right order when displaying
  if (delta === 0) {
    return -1
  }

  return delta
}

export const hasOnlyInputsWith = (inputs: Input[], addresses: Address[]): boolean =>
  inputs.every((i) => addresses.map((a) => a.hash).indexOf(i?.address ?? '') >= 0)

export const hasOnlyOutputsWith = (outputs: Output[], addresses: Address[]): boolean =>
  outputs.every((o) => addresses.map((a) => a.hash).indexOf(o?.address ?? '') >= 0)

export const getDirection = (tx: Transaction, address: AddressHash): TransactionDirection => {
  const amount = calAmountDelta(tx, address)
  const amountIsBigInt = typeof amount === 'bigint'
  return amount && amountIsBigInt && amount < 0 ? 'out' : 'in'
}

export const calculateTotalTxOutput = (tx: Transaction) => {
  const total = (tx.outputs ?? []).reduce((acc, o) => acc + BigInt(o?.attoAlphAmount ?? 0), BigInt(0))

  // We must do best effort to determine the change addresses. Usually they are the last TXs.
  const inputs = uniq((tx.inputs ?? []).map((i) => i.address))
  let change = BigInt(0)

  for (let index = (tx.outputs ?? []).length - 1; index > 0; index--) {
    const output = (tx.outputs ?? [])[index]
    const inputIndex = inputs.indexOf(output.address)
    if (inputs[inputIndex]) {
      change += BigInt(output.attoAlphAmount)
      inputs.splice(inputIndex, 1)
    }
    if (inputs.length == 0) return total - change
  }

  return total - change
}

export const fromUnconfirmedTransactionToPendingTx = (
  tx: UnconfirmedTransaction,
  belongingTo: AddressHash,
  network: NetworkName
): PendingTx => {
  let amount = calculateTotalTxOutput(tx as unknown as Transaction)
  const amountIsBigInt = typeof amount === 'bigint'
  const type = amount && amountIsBigInt && amount < 0 ? 'out' : 'in'
  amount = amount && (type === 'out' ? amount * BigInt(-1) : amount)

  const fromAddress = type === 'out' ? belongingTo : ((tx.inputs ?? [])[0] ?? {}).address
  const toAddress = type === 'in' ? ((tx.outputs ?? [])[0] ?? {}).address : belongingTo

  if (!fromAddress) throw new Error('fromAddress is not defined')
  if (!toAddress) throw new Error('toAddress is not defined')

  return {
    txId: tx.hash,
    fromAddress,
    toAddress,
    // No other reasonable way to know when it was sent, so using the lastSeen is the best approximation
    timestamp: tx.lastSeen,
    type: 'transfer',
    // SUPER important that this is the same as the current network. Lots of debug time used tracking this down.
    network,
    amount
  }
}
