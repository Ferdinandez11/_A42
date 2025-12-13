// PriceCell.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriceCell } from '../PriceCell';

describe('PriceCell', () => {
  it('should render price without discount', () => {
    render(<PriceCell price={1000} discountRate={0} />);
    expect(screen.getByText(/1000/)).toBeInTheDocument();
  });

  it('should render price with discount', () => {
    render(<PriceCell price={900} discountRate={10} />);
    expect(screen.getByText(/900/)).toBeInTheDocument();
    expect(screen.getByText(/10%/)).toBeInTheDocument();
  });

  it('should show base price when discount is applied', () => {
    render(<PriceCell price={900} discountRate={10} />);
    expect(screen.getByText(/Base:/)).toBeInTheDocument();
  });
});

