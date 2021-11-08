import { HTMLMotionProps, motion, Variants } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import tinycolor from 'tinycolor2'

interface ButtonProps extends HTMLMotionProps<'button'> {
  secondary?: boolean
  alert?: boolean
  disabled?: boolean
  transparent?: boolean
  squared?: boolean
  submit?: boolean
}

const variants: Variants = {
  hidden: { y: 10, opacity: 0 },
  shown: (disabled) => ({ y: 0, opacity: disabled ? 0.5 : 1 }),
  disabled: { y: 0, opacity: 0.5 }
}

export const Button = ({ children, disabled, submit, ...props }: ButtonProps) => {
  const [canBeAnimated, setCanBeAnimateds] = useState(props.squared ? true : false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((submit && e.code === 'Enter') || e.code === 'NumpadEnter') {
        buttonRef.current?.click()
      }
    }

    document.addEventListener('keydown', listener)

    return () => {
      document.removeEventListener('keydown', listener)
    }
  })

  return (
    <StyledButton
      {...props}
      variants={variants}
      custom={disabled}
      disabled={disabled}
      animate={canBeAnimated ? (!disabled ? 'shown' : 'disabled') : false}
      onAnimationComplete={() => setCanBeAnimateds(true)}
      type={submit ? 'submit' : 'button'}
      ref={buttonRef}
    >
      {children}
    </StyledButton>
  )
}

// === Styling

const StyledButton = styled(motion.button)<ButtonProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  height: ${({ squared }) => (squared ? '40px' : '46px')};
  width: ${({ squared }) => (squared ? '40px' : '80%')};
  max-width: 250px;
  border-radius: 7px;
  border: none;
  background-color: ${({ theme, secondary, transparent, alert }) =>
    alert && !secondary
      ? theme.global.alert
      : transparent
      ? 'transparent'
      : secondary
      ? theme.bg.secondary
      : theme.global.accent};
  color: ${({ theme, secondary, alert, transparent }) =>
    alert && secondary
      ? theme.global.alert
      : transparent
      ? theme.font.secondary
      : alert
      ? theme.font.contrastPrimary
      : secondary
      ? theme.global.accent
      : theme.font.contrastPrimary};
  font-weight: 500;
  font-size: inherit;
  font-family: inherit;
  padding: ${({ squared }) => (squared ? '10px' : '0 13px')};
  min-width: ${({ squared }) => (squared ? '40px' : '60px')};
  text-align: center;

  transition: 0.2s ease-out;

  &:not(:last-child) {
    margin: ${({ squared }) => (squared ? '0' : '12px 0')};
  }

  &:hover {
    background-color: ${({ theme, secondary, transparent, alert }) =>
      transparent
        ? 'transparent'
        : secondary
        ? tinycolor(theme.bg.tertiary).lighten(30).toString()
        : alert
        ? tinycolor(theme.global.alert).darken(8).toString()
        : tinycolor(theme.global.accent).darken(8).toString()};

    color: ${({ theme, transparent }) => transparent && theme.font.primary};
    cursor: pointer;
  }

  &:active {
    background-color: ${({ theme, secondary, alert }) =>
      secondary
        ? tinycolor(theme.bg.tertiary).darken(40).toString()
        : alert
        ? tinycolor(theme.global.alert).lighten(3).toString()
        : tinycolor(theme.global.accent).lighten(3).toString()};
  }

  pointer-events: ${({ disabled: deactivated }) => (deactivated ? 'none' : 'auto')};

  &:focus-visible {
    box-shadow: 0 0 0 3px ${({ theme }) => tinycolor(theme.global.accent).darken(20).toString()};
  }
`
