type CategoryTabsProps = {
  categories: readonly string[];
  active: string;
  onSelect: (name: string) => void;
};

export function CategoryTabs({ categories, active, onSelect }: CategoryTabsProps) {
  return (
    <div role="group" aria-label="Menu categories" className="flex items-center gap-6">
      {categories.map((name) => {
        const isActive = name === active;
        return (
          <button
            key={name}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(name)}
            className={`whitespace-nowrap border-0 border-b-[3px] bg-transparent px-[2px] py-[10px] text-[13px] font-bold uppercase tracking-[0.02em] transition-colors duration-fast ${
              isActive ? 'border-magenta text-brand' : 'border-transparent text-muted'
            }`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
