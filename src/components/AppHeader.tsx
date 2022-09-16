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

import { colord } from 'colord'
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion'
import { Eye, EyeOff, Settings as SettingsIcon, WifiOff } from 'lucide-react'
import { FC, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactTooltip from 'react-tooltip'
import styled, { useTheme } from 'styled-components'

import { useAddressesContext } from '../contexts/addresses'
import { useGlobalContext } from '../contexts/global'
import { useScrollContext } from '../contexts/scroll'
import SettingsModal from '../modals/SettingsModal'
import { deviceBreakPoints } from '../style/globalStyles'
import AddressBadge from './AddressBadge'
import Button from './Button'
import CompactToggle from './Inputs/CompactToggle'
import NetworkBadge from './NetworkBadge'
import ThemeSwitcher from './ThemeSwitcher'
import Tooltip from './Tooltip'

const AppHeader: FC = ({ children }) => {
  const { t } = useTranslation('App')
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const { scroll } = useScrollContext()
  const scrollY = useMotionValue(0)
  const theme = useTheme()
  const { mainAddress } = useAddressesContext()
  const { networkStatus, isPassphraseUsed } = useGlobalContext()
  const isOffline = networkStatus === 'offline'

  scrollY.set(scroll?.scrollTop ?? 0)

  const headerBGColor = useTransform(
    scrollY,
    [0, 100],
    [colord(theme.bg.primary).alpha(0).toRgbString(), theme.bg.primary]
  )
  const {
    settings: {
      general: { discreetMode }
    },
    updateSettings
  } = useGlobalContext()

  useEffect(() => {
    if (isOffline || mainAddress) ReactTooltip.rebuild()
  }, [isOffline, mainAddress])

  return (
    <>
      <HeaderContainer id="app-header" style={{ backgroundColor: headerBGColor }}>
        <ThemeSwitcher />
        <HeaderDivider />
        {isOffline && (
          <>
            <div data-tip={t`The wallet is offline.`}>
              <OfflineIcon size={20} />
            </div>
            <HeaderDivider />
          </>
        )}
        {children && (
          <>
            {children}
            <HeaderDivider />
          </>
        )}
        <CompactToggle
          toggled={discreetMode}
          onToggle={() => updateSettings('general', { discreetMode: !discreetMode })}
          IconOn={EyeOff}
          IconOff={Eye}
          data-tip={t`Discreet mode`}
        />
        {mainAddress && !isPassphraseUsed && (
          <>
            <HeaderDivider />
            <AddressBadge address={mainAddress} data-tip={t`Main address`} />
          </>
        )}
        <HeaderDivider />
        <NetworkBadge />
        <HeaderDivider />
        <Button
          transparent
          squared
          onClick={() => setIsSettingsModalOpen(true)}
          aria-label={t`Settings`}
          data-tip={t`Settings`}
        >
          <SettingsIcon />
        </Button>
      </HeaderContainer>
      <AnimatePresence>
        {isSettingsModalOpen && <SettingsModal onClose={() => setIsSettingsModalOpen(false)} />}
      </AnimatePresence>
      <Tooltip />
    </>
  )
}

export default AppHeader

export const HeaderDivider = styled.div`
  width: 1px;
  height: var(--spacing-2);
  background-color: ${({ theme }) => (theme.name === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.15)')};
`

const HeaderContainer = styled(motion.header)`
  height: 50px;
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 900;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0 var(--spacing-4);
  gap: var(--spacing-1);

  > *:not(:last-child) {
    margin-right: var(--spacing-1);
  }

  @media ${deviceBreakPoints.mobile} {
    background-color: ${({ theme }) => theme.bg.primary};
  }
`

const OfflineIcon = styled(WifiOff)`
  color: ${({ theme }) => theme.font.secondary};
  margin: 0 10px;
`
