import { Search } from 'lucide-react'

export default function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 max-w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Search'}
          className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400"
        />
      </div>
    </div>
  )
}
