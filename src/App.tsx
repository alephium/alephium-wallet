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

import { useEffect, useState } from 'react'
import ReactTooltip from 'react-tooltip'
import styled, { ThemeProvider } from 'styled-components'

import SnackbarManager from './components/SnackbarManager'
import Spinner from './components/Spinner'
import SplashScreen from './components/SplashScreen'
import Tooltip from './components/Tooltip'
import { useAddressesContext } from './contexts/addresses'
import { useGlobalContext } from './contexts/global'
import Router from './routes'
import { deviceBreakPoints, GlobalStyle } from './style/globalStyles'
import { darkTheme, lightTheme } from './style/themes'

const App = () => {
  const [splashScreenVisible, setSplashScreenVisible] = useState(true)
  const { networkStatus, settings, snackbarMessage, isClientLoading } = useGlobalContext()
  const { mainAddress } = useAddressesContext()
  const isOffline = networkStatus === 'offline'

  useEffect(() => {
    if (isOffline || mainAddress) ReactTooltip.rebuild()
  }, [isOffline, mainAddress])

  return (
    <ThemeProvider theme={settings.general.theme === 'light' ? lightTheme : darkTheme}>
      <GlobalStyle />
      <AppContainer>
        {splashScreenVisible && <SplashScreen onSplashScreenShown={() => setSplashScreenVisible(false)} />}
        <Router />
      </AppContainer>
      <ClientLoading>{isClientLoading && <Spinner size="15px" />}</ClientLoading>
      <SnackbarManager message={snackbarMessage} />
      <Tooltip />
    </ThemeProvider>
  )
}

const AppContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: ${({ theme }) => theme.bg.secondary};

  @media ${deviceBreakPoints.mobile} {
    background-color: ${({ theme }) => theme.bg.primary};
    justify-content: initial;
  }
`

const ClientLoading = styled.div`
  position: absolute;
  top: var(--spacing-3);
  left: var(--spacing-5);
  transform: translateX(-50%);
  color: var(--color-white);
`

export default App
