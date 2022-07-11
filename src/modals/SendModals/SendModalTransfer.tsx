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

import { convertAlphToSet } from '@alephium/sdk'
import { SignTransferTxResult } from 'alephium-web3'
import { useState } from 'react'

import InfoBox from '../../components/InfoBox'
import Input from '../../components/Inputs/Input'
import { Client } from '../../contexts/global'
import { useSendModalContext } from '../../contexts/sendModal'
import useDappTxData from '../../hooks/useDappTxData'
import { TransferTxData } from '../../types/transactions'
import { isAddressValid } from '../../utils/addresses'
import { isAmountWithinRange } from '../../utils/transactions'
import AlphAmountInfoBox from './AlphAmountInfoBox'
import BuildTxFooterButtons from './BuildTxFooterButtons'
import { useBuildTxCommonComponents } from './hooks'
import { ModalInputFields } from './ModalInputFields'
import SendModal, { TxContext } from './SendModal'
import { CheckTxProps, PartialTxData } from './types'
import { expectedAmount } from './utils'

interface TransferBuildTxModalContentProps {
  data: PartialTxData<TransferTxData, 'fromAddress'>
  onSubmit: (data: TransferTxData) => void
  onCancel: () => void
}

const TransferTxModal = () => {
  const { closeSendModal } = useSendModalContext()
  const initialTxData = useDappTxData() as TransferBuildTxModalContentProps['data']

  return (
    <SendModal
      buildTitle="Send"
      initialTxData={initialTxData}
      onClose={closeSendModal}
      BuildTxModalContent={TransferBuildTxModalContent}
      CheckTxModalContent={TransferCheckTxModalContent}
      buildTransaction={buildTransaction}
      handleSend={handleSend}
      getWalletConnectResult={getWalletConnectResult}
    />
  )
}

const TransferCheckTxModalContent = ({ data, fees }: CheckTxProps<TransferTxData>) => (
  <>
    <InfoBox label="From address" text={data.fromAddress.hash} wordBreak />
    <InfoBox label="To address" text={data.toAddress} wordBreak />
    <AlphAmountInfoBox label="Amount" amount={expectedAmount(data, fees)} />
    <AlphAmountInfoBox label="Expected fee" amount={fees} fullPrecision />
  </>
)

const TransferBuildTxModalContent = ({ data, onSubmit, onCancel }: TransferBuildTxModalContentProps) => {
  const [
    fromAddress,
    FromAddressSelect,
    alphAmount,
    AlphAmountInput,
    gasAmount,
    gasPrice,
    GasSettingsExpandableSection,
    isCommonReady
  ] = useBuildTxCommonComponents(data.fromAddress, data.alphAmount, data.gasAmount, data.gasPrice)
  const [toAddress, setToAddress] = useStateWithError(data?.toAddress ?? '')

  const handleAddressChange = (value: string) => {
    setToAddress(value, isAddressValid(value) ? '' : 'Address format is incorrect')
  }

  if (fromAddress === undefined) {
    onCancel()
    return <></>
  }

  const isSubmitButtonActive =
    isCommonReady &&
    toAddress.value &&
    !toAddress.error &&
    alphAmount &&
    isAmountWithinRange(convertAlphToSet(alphAmount), fromAddress.availableBalance)

  return (
    <>
      <ModalInputFields>
        {FromAddressSelect}
        <Input
          label="Recipient's address"
          value={toAddress.value}
          onChange={(e) => handleAddressChange(e.target.value)}
          error={toAddress.error}
          isValid={toAddress.value.length > 0 && !toAddress.error}
        />
        {AlphAmountInput}
      </ModalInputFields>
      {GasSettingsExpandableSection}
      <BuildTxFooterButtons
        onSubmit={() =>
          onSubmit({
            fromAddress: fromAddress,
            toAddress: toAddress.value,
            alphAmount: alphAmount,
            gasAmount: gasAmount.parsed,
            gasPrice: gasPrice.parsed
          })
        }
        onCancel={onCancel}
        isSubmitButtonActive={isSubmitButtonActive}
      />
    </>
  )
}

const buildTransaction = async (client: Client, transactionData: TransferTxData, context: TxContext) => {
  const { fromAddress, toAddress, alphAmount, gasAmount, gasPrice } = transactionData
  const amountInSet = convertAlphToSet(alphAmount)
  const sweep = amountInSet === fromAddress.availableBalance
  context.setIsSweeping(sweep)
  if (sweep) {
    const { unsignedTxs, fees } = await client.buildSweepTransactions(fromAddress, toAddress)
    context.setSweepUnsignedTxs(unsignedTxs)
    context.setFees(fees)
  } else {
    const { data } = await client.clique.transactionCreate(
      fromAddress.hash,
      fromAddress.publicKey,
      toAddress,
      amountInSet.toString(),
      undefined,
      gasAmount ? gasAmount : undefined,
      gasPrice ? convertAlphToSet(gasPrice).toString() : undefined
    )
    context.setUnsignedTransaction(data)
    context.setUnsignedTxId(data.txId)
    context.setFees(BigInt(data.gasAmount) * BigInt(data.gasPrice))
  }
}

const handleSend = async (client: Client, transactionData: TransferTxData, context: TxContext) => {
  const { fromAddress, toAddress, alphAmount } = transactionData

  if (toAddress && context.unsignedTransaction) {
    if (context.isSweeping) {
      const sendToAddress = context.consolidationRequired ? fromAddress.hash : toAddress
      const transactionType = context.consolidationRequired ? 'consolidation' : 'sweep'

      for (const { txId, unsignedTx } of context.sweepUnsignedTxs) {
        const data = await client.signAndSendTransaction(
          fromAddress,
          txId,
          unsignedTx,
          sendToAddress,
          transactionType,
          context.currentNetwork
        )

        if (data) context.setAddress(fromAddress)
      }
    } else {
      const data = await client.signAndSendTransaction(
        fromAddress,
        context.unsignedTxId,
        context.unsignedTransaction.unsignedTx,
        toAddress,
        'transfer',
        context.currentNetwork,
        convertAlphToSet(alphAmount)
      )

      return data.signature
    }
  }
}

const getWalletConnectResult = (context: TxContext, signature: string): SignTransferTxResult => {
  if (context.unsignedTransaction)
    return {
      fromGroup: context.unsignedTransaction.fromGroup,
      toGroup: context.unsignedTransaction.toGroup,
      unsignedTx: context.unsignedTransaction.unsignedTx,
      txId: context.unsignedTxId,
      signature
    }

  throw Error('No unsignedTransaction available')
}

function useStateWithError<T>(initialValue: T) {
  const [value, setValue] = useState({ value: initialValue, error: '' })

  const setValueWithError = (newValue: T, newError: string) => {
    setValue({ value: newValue, error: newError })
  }

  return [value, setValueWithError] as const
}

export default TransferTxModal
