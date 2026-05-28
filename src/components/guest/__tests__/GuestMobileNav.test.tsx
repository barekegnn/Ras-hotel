// ============================================================
// Component Tests — GuestMobileNav
// src/components/guest/__tests__/GuestMobileNav.test.tsx
// ============================================================

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GuestMobileNav } from '../GuestMobileNav';

describe('GuestMobileNav', () => {
  it('renders the hamburger button', () => {
    render(<GuestMobileNav />);
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
  });

  it('menu is closed by default', () => {
    render(<GuestMobileNav />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the menu when hamburger is clicked', () => {
    render(<GuestMobileNav />);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('shows all nav links when open', () => {
    render(<GuestMobileNav />);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.getByText('Rooms')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('My booking')).toBeInTheDocument();
    expect(screen.getByText('Staff portal')).toBeInTheDocument();
  });

  it('closes the menu when a nav link is clicked', () => {
    render(<GuestMobileNav />);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    fireEvent.click(screen.getByText('Rooms'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('shows close button when menu is open', () => {
    render(<GuestMobileNav />);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.getByRole('button', { name: /close menu/i })).toBeInTheDocument();
  });

  it('closes the menu when close button is clicked', () => {
    render(<GuestMobileNav />);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    fireEvent.click(screen.getByRole('button', { name: /close menu/i }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('sets aria-expanded correctly', () => {
    render(<GuestMobileNav />);
    const btn = screen.getByRole('button', { name: /open menu/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(btn);
    expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute('aria-expanded', 'true');
  });
});
