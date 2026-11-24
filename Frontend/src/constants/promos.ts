import { PHOTO, photoUrl } from './images';

export type PromoSlide = {
  tag: string;
  headline: string;
  accent: string;
  copy: string;
  image: string;
  imageAlt: string;
};

const PROMO_IMAGE_WIDTH = 900;

export const PROMO_SLIDES: readonly PromoSlide[] = [
  {
    tag: 'Table Ordering',
    headline: 'Order Faster',
    accent: 'From Your Seat',
    copy: 'Choose your noodles, dimsum and drinks, then send your order straight from your table.',
    image: photoUrl(PHOTO.spicyNoodles, PROMO_IMAGE_WIDTH),
    imageAlt: 'Bowl of freshly wok-tossed spicy noodles',
  },
  {
    tag: 'Dimsum',
    headline: 'Dimsum Time',
    accent: 'Share And Enjoy',
    copy: 'Dumplings, siomay and more are ready to add to your order.',
    image: photoUrl(PHOTO.dumplings, PROMO_IMAGE_WIDTH),
    imageAlt: 'Steamed dumplings',
  },
  {
    tag: 'Noodles',
    headline: 'Noodle Lovers',
    accent: 'Pick Your Bowl',
    copy: 'From classic mie suit to fried noodles, find the bowl you like best.',
    image: photoUrl(PHOTO.scallionNoodles, PROMO_IMAGE_WIDTH),
    imageAlt: 'Stir-fried scallion noodles',
  },
  {
    tag: 'Drinks',
    headline: 'Cool Drinks',
    accent: 'Pair With Heat',
    copy: 'Balance a hot bowl with a chilled drink.',
    image: photoUrl(PHOTO.cocoa, PROMO_IMAGE_WIDTH),
    imageAlt: 'Iced cocoa drink',
  },
];
