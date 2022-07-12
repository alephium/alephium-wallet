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

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { TwitterPicker } from 'react-color'
import { useDetectClickOutside } from 'react-detect-click-outside'
import styled from 'styled-components'

import { getRandomLabelColor, labelColorPalette } from '../../utils/colors'
import { inputDefaultStyle, InputProps } from '.'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  const color = value?.toString() || getRandomLabelColor()
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const ref = useDetectClickOutside({ onTriggered: () => setIsPopupOpen(false) })

  const handlePopupOpen = () => setIsPopupOpen(!isPopupOpen)
  const onChangeComplete = (newColor: { hex: string }) => {
    onChange(newColor.hex)
    handlePopupOpen()
  }

  return (
    <ColorPickerContainer ref={ref}>
      <Input role="button" tabIndex={0} onClick={handlePopupOpen} onKeyPress={handlePopupOpen}>
        <Circle color={color} />
      </Input>
      <AnimatePresence exitBeforeEnter initial={true}>
        {isPopupOpen && (
          <Popup initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TwitterPickerStyled
              color={color}
              onChangeComplete={onChangeComplete}
              colors={labelColorPalette}
              triangle="top-right"
            />
          </Popup>
        )}
      </AnimatePresence>
    </ColorPickerContainer>
  )
}

const ColorPickerContainer = styled.div<InputProps>`
  position: relative;
  width: auto;
  display: inline-flex;
  flex-direction: column;
`

const Input = styled.div<InputProps>`
  ${({ isValid }) => inputDefaultStyle(isValid)}
  cursor: pointer;
  position: relative;
  display: inline-flex;
  align-items: center;
  width: auto;
`

const Popup = styled(motion.div)`
  z-index: 1;
  position: absolute;
  top: calc(var(--inputHeight) + 10px);
  right: 0;
`

const TwitterPickerStyled = styled(TwitterPicker)``

const Circle = styled.div<{ color: string }>`
  width: 16px;
  height: 16px;
  border-radius: 16px;
  background-color: ${({ color }) => color};
`

export default ColorPicker
