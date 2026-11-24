import logoMark from '@/assets/logo-mark.png';
import { BRAND } from '@/constants/brand';

export function BrandLockup() {
  return (
    <span className="inline-flex items-center gap-[10px]">
      <img src={logoMark} alt="" width={32} height={32} className="rounded-[9px]" />
      <span className="font-display text-[17px] font-extrabold uppercase leading-[1.05] tracking-[0.04em]">
        {BRAND.name}
      </span>
    </span>
  );
}
