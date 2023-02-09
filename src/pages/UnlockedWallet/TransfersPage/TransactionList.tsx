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

import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import ActionLink from '@/components/ActionLink'
import Table, { TableCell, TableCellPlaceholder, TableRow } from '@/components/Table'
import TransactionalInfo from '@/components/TransactionalInfo'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import {
  selectAddressIds,
  selectAllAddresses,
  syncAllAddressesTransactionsNextPage
} from '@/storage/app-state/slices/addressesSlice'
import { selectAddressesConfirmedTransactions } from '@/storage/app-state/slices/confirmedTransactionsSlice'
import { selectAddressesPendingTransactions } from '@/storage/app-state/slices/pendingTransactionsSlice'
import { AddressHash } from '@/types/addresses'
import { AddressConfirmedTransaction } from '@/types/transactions'

interface TransfersPageTransactionListProps {
  onTransactionClick: (transaction: AddressConfirmedTransaction) => void
  className?: string
}

const TransfersPageTransactionList = ({ className, onTransactionClick }: TransfersPageTransactionListProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const addresses = useAppSelector(selectAllAddresses)
  const addressHashes = useAppSelector(selectAddressIds) as AddressHash[]
  const [allConfirmedTxs, allPendingTxs, allTransactionsLoaded, isLoading] = useAppSelector((s) => [
    selectAddressesConfirmedTransactions(s, addressHashes),
    selectAddressesPendingTransactions(s, addressHashes),
    s.addresses.allTransactionsLoaded,
    s.addresses.loading
  ])

  const totalNumberOfTransactions = addresses.map((address) => address.txNumber).reduce((a, b) => a + b, 0)
  const showSkeletonLoading = isLoading && !allConfirmedTxs.length && !allPendingTxs.length

  const loadNextTransactionsPage = () => dispatch(syncAllAddressesTransactionsNextPage())

  return (
    <Table isLoading={showSkeletonLoading} className={className} minWidth="500px">
      <TableHeaderRow>
        <TableTitle>{t('Transactions')}</TableTitle>
      </TableHeaderRow>
      {allPendingTxs.map((tx) => (
        <TableRow key={tx.hash} blinking role="row" tabIndex={0}>
          <TransactionalInfo transaction={tx} addressHash={tx.address.hash} />
        </TableRow>
      ))}
      {allConfirmedTxs.map((tx) => (
        <TableRow
          key={`${tx.hash}-${tx.address.hash}`}
          role="row"
          tabIndex={0}
          onClick={() => onTransactionClick(tx)}
          onKeyPress={() => onTransactionClick(tx)}
        >
          <TransactionalInfo transaction={tx} addressHash={tx.address.hash} />
        </TableRow>
      ))}
      {allConfirmedTxs.length !== totalNumberOfTransactions && (
        <TableRow role="row">
          <TableCell align="center" role="gridcell">
            {allTransactionsLoaded ? (
              <span>{t('All transactions loaded!')}</span>
            ) : (
              <ActionLink onClick={loadNextTransactionsPage}>{t`Show more`}</ActionLink>
            )}
          </TableCell>
        </TableRow>
      )}
      {!isLoading && !allPendingTxs.length && !allConfirmedTxs.length && (
        <TableRow role="row" tabIndex={0}>
          <TableCellPlaceholder align="center">{t`No transactions to display`}</TableCellPlaceholder>
        </TableRow>
      )}
    </Table>
  )
}

export default TransfersPageTransactionList

const TableHeaderRow = styled(TableRow)`
  display: flex;
  justify-content: space-between;
  height: 60px;
  background-color: ${({ theme }) => theme.bg.secondary};
`

const TableTitle = styled.div`
  font-size: 16px;
  font-weight: var(--fontWeight-semiBold);
`
