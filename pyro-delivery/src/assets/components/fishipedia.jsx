import { useState } from 'react'
import './fishipedia.css'

const EXCLUDED_BIOMES = new Set([
	'Nether Wastes',
	'Crimson Forest',
	'Warped Forest',
	'Soul Sand Valley',
	'Basalt Deltas',
])

function Fishipedia({ data }) {
	const fish = Object.values(data.fish)
	const rarityRates = Object.entries(data.rarity_rates)
	const getFishBiomes = (entry) => entry.biomes.filter((biome) => !EXCLUDED_BIOMES.has(biome))
	const biomes = fish.reduce((biomes, entry) => {
		getFishBiomes(entry).forEach((biome) => {
			if (!biomes.includes(biome) && biome != "All Biomes"){
				biomes.push(biome)
			}
		})

		return biomes.sort((a, b) => a.localeCompare(b))
	}, []);

	const [searchTerm, setSearchTerm] = useState('')
	const [rarityFilter, setRarityFilter] = useState('all')
	const [biomeFilter, setBiomeFilter] = useState('all');
	const [sortBy, setSortBy] = useState('rarity')
	const biomePools = fish.reduce((pools, entry) => {
		getFishBiomes(entry).forEach((biome) => {
			const poolKey = `${entry.rarity}:${biome}`
			pools[poolKey] = (pools[poolKey] || 0) + 1
		})
		return pools
	}, {})

	const getBestBiome = (entry) => getFishBiomes(entry)
		.map((biome) => {
			const poolSize = biomePools[`${entry.rarity}:${biome}`]
			return {
				biome,
				rate: data.rarity_rates[entry.rarity].percent / poolSize,
			}
		})
		.sort((first, second) => second.rate - first.rate)[0]

	const formatRate = (rate) => `${rate >= 1 ? rate.toFixed(1) : rate.toFixed(2)}%`
	const visibleFish = fish
		.filter((entry) => {
			const matchesName = entry.name.toLowerCase().includes(searchTerm.toLowerCase())
			const matchesRarity = rarityFilter === 'all' || entry.rarity === rarityFilter
			const matchesBiome = biomeFilter === 'all' || entry.biomes.includes(biomeFilter)
			return matchesName && matchesRarity && matchesBiome
		})
		.sort((first, second) => {
			if (sortBy === 'rarity') {
				return data.rarity_rates[second.rarity].percent - data.rarity_rates[first.rarity].percent
			}
			if (sortBy === 'rate') {
				return getBestBiome(second).rate - getBestBiome(first).rate
			}
			return first.name.localeCompare(second.name)
		})

	return (
		<section className="fishipedia" aria-labelledby="fishipedia-title">
			<header className="fishipedia__header">
				<div>
					<p className="eyebrow">PyroFishing reference</p>
					<h1 id="fishipedia-title">Fishipedia</h1>
					<p className="fishipedia__intro">
						Browse the fish pool by rarity and discover where each catch can be found.
					</p>
				</div>
				<div className="fishipedia__count" aria-label={`${fish.length} fish entries`}>
					<strong>{fish.length}</strong>
					<span>fish entries</span>
				</div>
			</header>

			<div className="rarity-list" aria-label="Rarity rates">
				{rarityRates.map(([rarity, rate]) => (
					<div className="rarity-rate" key={rarity}>
						<span className={`rarity-dot rarity-dot--${rarity.toLowerCase()}`} />
						<span>{rarity}</span>
						<strong>{rate.percent}%</strong>
					</div>
				))}
			</div>

			<div className="fish-controls">
				<label className="fish-search">
					<span>Search fish</span>
					<input
						 type="search"
						 value={searchTerm}
						 onChange={(event) => setSearchTerm(event.target.value)}
						 placeholder="Search by name..."
					/>
				</label>
				<label>
					<span>Rarity</span>
					<select value={rarityFilter} onChange={(event) => setRarityFilter(event.target.value)}>
						<option value="all">All rarities</option>
						{rarityRates.map(([rarity]) => (
							<option value={rarity} key={rarity}>{rarity}</option>
						))}
					</select>
				</label>
				<label>
					<span>Biome</span>
					<select value={biomeFilter} onChange={(event) => setBiomeFilter(event.target.value)}>
						<option value="all">All Biomes</option>
						{biomes.map((biome) => (
							<option value={biome} key={biome}>{biome}</option>
						))}
					</select>
				</label>
				<label>
					<span>Sort by</span>
					<select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
						<option value="name">Name</option>
						<option value="rarity">Rarity</option>
						<option value="rate">Best biome rate</option>
					</select>
				</label>
				<p className="fish-results" aria-live="polite">
					Showing {visibleFish.length} of {fish.length}
				</p>
			</div>

			<div className="fish-grid">
				{visibleFish.map((entry) => {
					const bestBiome = getBestBiome(entry)

					return (
						<article className="fish-card" key={entry.name}>
						<div className="fish-card__topline">
							<span className={`rarity-label rarity-label--${entry.rarity.toLowerCase()}`}>
								{entry.rarity}
							</span>
							<details className="biome-details">
								<summary>{entry.biomes.length} listed biomes</summary>
								<div className="biome-details__panel">
									<strong>Available biomes</strong>
									<ul>
										{entry.biomes.map((biome) => (
											<li className={EXCLUDED_BIOMES.has(biome) ? 'biome-details__excluded' : ''} key={biome}>
												{biome}{EXCLUDED_BIOMES.has(biome) ? ' - excluded' : ''}
											</li>
										))}
									</ul>
								</div>
							</details>
						</div>
						<h2>{entry.name}</h2>
								<div className="best-biome">
									<span className="best-biome__label">Best biome</span>
									<strong>{bestBiome.biome}</strong>
									<span className="best-biome__rate">{formatRate(bestBiome.rate)} base rate</span>
								</div>
					</article>
							)
						})}
						{visibleFish.length === 0 && (
							<p className="fish-no-results">No fish match those filters.</p>
						)}
			</div>
		</section>
	)
}

export default Fishipedia
