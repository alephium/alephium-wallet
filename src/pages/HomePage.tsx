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

import { motion } from 'framer-motion'
import React, { useCallback, useEffect, useState } from 'react'
import { useHistory } from 'react-router'
import styled from 'styled-components'
import tinycolor from 'tinycolor2'

import AppHeader from '../components/AppHeader'
import Button from '../components/Button'
import SideBar from '../components/HomePage/SideBar'
import Input from '../components/Inputs/Input'
import Select from '../components/Inputs/Select'
import WalletPassphrase from '../components/Inputs/WalletPassphrase'
import { FloatingPanel, Section } from '../components/PageComponents/PageContainers'
import PanelTitle from '../components/PageComponents/PanelTitle'
import Paragraph from '../components/Paragraph'
import { useGlobalContext } from '../contexts/global'
import UpdateWalletModal from '../modals/UpdateWalletModal'
import { deviceBreakPoints } from '../style/globalStyles'

interface HomeProps {
  hasWallet: boolean
  accountNames: string[]
}

const HomePage = ({ hasWallet, accountNames }: HomeProps) => {
  const [showInitialActions, setShowInitialActions] = useState(false)
  const { newLatestVersion } = useGlobalContext()
  const [isUpdateWalletModalVisible, setUpdateWalletModalVisible] = useState(!!newLatestVersion)

  const hideInitialActions = () => setShowInitialActions(false)
  const displayInitialActions = () => setShowInitialActions(true)

  useEffect(() => {
    if (newLatestVersion) setUpdateWalletModalVisible(true)
  }, [newLatestVersion])

  return (
    <HomeContainer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
      <AppHeader />
      <SideBar />
      <InteractionArea>
        <FloatingPanel verticalAlign="center" horizontalAlign="center">
          {!showInitialActions && !hasWallet && (
            <>
              <PanelTitle useLayoutId={false}>Welcome!</PanelTitle>
              <InitialActions />
            </>
          )}
          {!showInitialActions && hasWallet && (
            <>
              <PanelTitle useLayoutId={false}>Welcome back!</PanelTitle>
              <Paragraph centered secondary>
                Please choose a wallet and enter your password to continue.
              </Paragraph>
              <Login onLinkClick={displayInitialActions} accountNames={accountNames} />
            </>
          )}
          {showInitialActions && (
            <>
              <PanelTitle useLayoutId={false}>New wallet</PanelTitle>
              <InitialActions showLinkToExistingAccounts onLinkClick={hideInitialActions} />
            </>
          )}
        </FloatingPanel>
      </InteractionArea>
      {isUpdateWalletModalVisible && (
        <UpdateWalletModal newVersion={newLatestVersion} onClose={() => setUpdateWalletModalVisible(false)} />
      )}
    </HomeContainer>
  )
}

// === Components

interface LoginProps {
  accountNames: string[]
  onLinkClick: () => void
}

const Login = ({ accountNames, onLinkClick }: LoginProps) => {
  const [credentials, setCredentials] = useState({ accountName: '', password: '' })
  const { login } = useGlobalContext()
  const history = useHistory()
  const [passphrase, setPassphraseState] = useState('')

  const handleCredentialsChange = useCallback((type: 'accountName' | 'password', value: string) => {
    setCredentials((prev) => ({ ...prev, [type]: value }))
  }, [])

  const handleLogin = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()
    login(credentials.accountName, credentials.password, () => history.push('/wallet/overview'), passphrase)
  }

  return (
    <>
      <SectionStyled inList>
        <Select
          label="Wallet"
          options={accountNames.map((u) => ({ label: u, value: u }))}
          onValueChange={(value) => handleCredentialsChange('accountName', value?.value || '')}
          title="Select a wallet"
          id="wallet"
        />
        <Input
          label="Password"
          type="password"
          autoComplete="off"
          onChange={(e) => handleCredentialsChange('password', e.target.value)}
          value={credentials.password}
          id="password"
        />
        <WalletPassphrase value={passphrase} onChange={setPassphraseState} />
      </SectionStyled>
      <SectionStyled inList>
        <Button onClick={handleLogin} submit disabled={!credentials.accountName || !credentials.password}>
          Login
        </Button>
      </SectionStyled>
      <SwitchLink onClick={onLinkClick} centered>
        Create / import a new wallet
      </SwitchLink>
    </>
  )
}

const InitialActions = ({
  showLinkToExistingAccounts,
  onLinkClick
}: {
  showLinkToExistingAccounts?: boolean
  onLinkClick?: () => void
}) => {
  const history = useHistory()

  return (
    <>
      <Paragraph centered secondary>
        Please choose whether you want to create a new wallet or import an existing one.
      </Paragraph>
      <Section inList>
        <Button onClick={() => history.push('/create')}>New wallet</Button>
        <Button onClick={() => history.push('/import')}>Import wallet</Button>
        {showLinkToExistingAccounts && (
          <SwitchLink onClick={onLinkClick} centered>
            Use an existing wallet
          </SwitchLink>
        )}
      </Section>
    </>
  )
}

const HomeContainer = styled(motion.main)`
  display: flex;
  flex: 1;

  @media ${deviceBreakPoints.mobile} {
    flex-direction: column;
  }
`

const InteractionArea = styled.div`
  flex: 1.5;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: var(--spacing-5);
`

const SwitchLink = styled(Paragraph)`
  color: ${({ theme }) => theme.global.accent};
  background-color: ${({ theme }) => theme.bg.primary};
  padding: var(--spacing-1);
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => tinycolor(theme.global.accent).darken(10).toString()};
  }
`

const SectionStyled = styled(Section)`
  min-width: 400px;
`

export default HomePage
