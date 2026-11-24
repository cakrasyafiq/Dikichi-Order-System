export type OrderStep = {
  title: string;
  description: string;
  icon: 'dineIn' | 'grid' | 'phone' | 'card' | 'clock';
};

export const ORDER_STEPS: readonly OrderStep[] = [
  {
    title: 'Choose Your Table',
    description: 'Scan the QR code on your table or select your table number.',
    icon: 'dineIn',
  },
  {
    title: 'Browse the Menu',
    description: 'Pick your favorite dishes in seconds.',
    icon: 'grid',
  },
  {
    title: 'Send Your Order',
    description: 'Add your name and submit. The cashier confirms it.',
    icon: 'phone',
  },
  {
    title: 'Pay at the Cashier',
    description: 'Pay with cash, QRIS or card at the counter.',
    icon: 'card',
  },
  {
    title: 'Freshly Prepared',
    description: 'The kitchen cooks your order as soon as payment is confirmed.',
    icon: 'clock',
  },
];
