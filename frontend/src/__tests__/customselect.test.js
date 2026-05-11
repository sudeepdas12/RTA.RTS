import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CustomSelect from '../components/CustomSelect';

describe('CustomSelect component', () => {
  test('renders numeric value and allows changing selection', async () => {
    const options = [
      { value: 1, label: 'One' },
      { value: 2, label: 'Two' }
    ];
    const handleChange = jest.fn();

    render(
      <CustomSelect
        options={options}
        value={1}
        onChange={handleChange}
        placeholder="Select a number"
        isSearchable={false}
      />
    );

    // initial label should be visible
    expect(screen.getByText('One')).toBeInTheDocument();

    // open dropdown and click the other option
    fireEvent.mouseDown(screen.getByRole('combobox'));
    await waitFor(() => screen.getByText('Two'));
    fireEvent.click(screen.getByText('Two'));

    expect(handleChange).toHaveBeenCalledWith(2);
  });
});
