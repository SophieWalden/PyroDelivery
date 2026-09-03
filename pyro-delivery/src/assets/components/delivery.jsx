import { useEffect, useState } from 'react'
import './delivery.css'

const DELIVERY_STORAGE_KEY = 'pyro-delivery-plans'
const EXCLUDED_BIOMES = new Set([
	'Nether Wastes',
	'Crimson Forest',
	'Warped Forest',
	'Soul Sand Valley',
	'Basalt Deltas',
])

function getSavedDeliveries() {
	try {
		const saved = JSON.parse(localStorage.getItem(DELIVERY_STORAGE_KEY))
		if (!Array.isArray(saved) || saved.length === 0) return null
		return saved.map((delivery) => ({
			id: delivery.id,
			name: delivery.name || 'Untitled delivery',
			quantity: Math.max(1, Number(delivery.quantity) || 1),
			targets: Array.isArray(delivery.targets) ? delivery.targets : [],
		}))
	} catch {
		return null
	}
}

function Delivery({ data }) {
	const fish = Object.values(data.fish)
	const getFishBiomes = (entry) => entry.biomes.filter((biome) => !EXCLUDED_BIOMES.has(biome))
	const fishByRarity = Object.keys(data.rarity_rates).map((rarity) => ({
		rarity,
		fish: fish
			.filter((entry) => entry.rarity === rarity)
			.sort((first, second) => first.name.localeCompare(second.name)),
	}))
	const [deliveries, setDeliveries] = useState(() => getSavedDeliveries() || [
		{ id: 1, name: 'Delivery 1', quantity: 1, targets: [] },
	])
	const [activeDeliveryId, setActiveDeliveryId] = useState(() => getSavedDeliveries()?.[0]?.id || 1)
	const [selectedFish, setSelectedFish] = useState('')
	const [quantityInput, setQuantityInput] = useState(() => String(getSavedDeliveries()?.[0]?.quantity || 1))

	useEffect(() => {
		try {
			localStorage.setItem(DELIVERY_STORAGE_KEY, JSON.stringify(deliveries))
		} catch {
			return
		}
	}, [deliveries])

	const biomePools = fish.reduce((pools, entry) => {
		getFishBiomes(entry).forEach((biome) => {
			const poolKey = `${entry.rarity}:${biome}`
			pools[poolKey] = (pools[poolKey] || 0) + 1
		})
		return pools
	}, {})

	const getRecommendations = (entry) => getFishBiomes(entry)
		.map((biome) => ({
			biome,
			rate: getRateForBiome(entry, biome),
		}))
		.sort((first, second) => second.rate - first.rate)
		.slice(0, 3)

	const formatRate = (rate) => `${rate >= 1 ? rate.toFixed(1) : rate.toFixed(2)}%`
	function getRateForBiome(entry, biome) {
		return data.rarity_rates[entry.rarity].percent / biomePools[`${entry.rarity}:${biome}`]
	}
	const activeDelivery = deliveries.find((delivery) => delivery.id === activeDeliveryId) || deliveries[0]
	const targetFish = activeDelivery.targets
		.map((name) => fish.find((entry) => entry.name === name))
		.filter(Boolean)
	const targetEntries = targetFish

	const getRoute = () => {
		const remaining = new Set(targetEntries.map((entry) => entry.name))
		const route = []

		while (remaining.size > 0) {
			const biomeScores = {}
			remaining.forEach((fishName) => {
				const entry = fish.find((candidate) => candidate.name === fishName)
				getFishBiomes(entry).forEach((biome) => {
					if (!biomeScores[biome]) biomeScores[biome] = { rate: 0, coverage: 0 }
					biomeScores[biome].rate += getRateForBiome(entry, biome)
					biomeScores[biome].coverage += 1
				})
			})

			const bestBiome = Object.entries(biomeScores)
				.sort((first, second) => second[1].rate - first[1].rate || second[1].coverage - first[1].coverage || first[0].localeCompare(second[0]))[0][0]
			const coveredFish = [...remaining].filter((fishName) => {
				const entry = fish.find((candidate) => candidate.name === fishName)
				return getFishBiomes(entry).includes(bestBiome)
			})

				route.push({ biome: bestBiome, fishNames: coveredFish })
			coveredFish.forEach((fishName) => remaining.delete(fishName))
		}

		return route
	}

	const addDelivery = () => {
		const id = Date.now()
		setDeliveries((current) => [...current, { id, name: `Delivery ${current.length + 1}`, quantity: 1, targets: [] }])
		setActiveDeliveryId(id)
		setSelectedFish('')
		setQuantityInput('1')
	}

	const removeDelivery = (id) => {
		setDeliveries((current) => {
			const remaining = current.filter((delivery) => delivery.id !== id)
			if (id === activeDeliveryId && remaining.length > 0) {
				setActiveDeliveryId(remaining[0].id)
				setQuantityInput(String(remaining[0].quantity))
			}
			return remaining
		})
	}

	const updateDeliveryName = (name) => {
		setDeliveries((current) => current.map((delivery) => (
			delivery.id === activeDeliveryId ? { ...delivery, name } : delivery
		)))
	}

	const addFish = (event) => {
		event.preventDefault()
		if (!selectedFish || activeDelivery.targets.includes(selectedFish)) return
		setDeliveries((current) => current.map((delivery) => (
			delivery.id === activeDeliveryId
				? { ...delivery, targets: [...delivery.targets, selectedFish] }
				: delivery
		)))
		setSelectedFish('')
	}

	const removeFish = (fishName) => {
		setDeliveries((current) => current.map((delivery) => (
			delivery.id === activeDeliveryId
			? { ...delivery, targets: delivery.targets.filter((target) => target !== fishName) }
			: delivery
		)))
	}

	const updateQuantity = (quantity) => {
		setQuantityInput(quantity)
		if (quantity === '') return
		setDeliveries((current) => current.map((delivery) => (
			delivery.id === activeDeliveryId
				? { ...delivery, quantity: Math.max(1, Number(quantity) || 1) }
				: delivery
		)))
	}

	const commitQuantity = () => {
		const quantity = Math.max(1, Number(quantityInput) || 1)
		setQuantityInput(String(quantity))
		updateQuantity(String(quantity))
	}

	const route = targetFish.length > 0 ? getRoute() : []
	const difficulty = targetFish.length > 0 ? (() => {
		const expectedCatches = targetFish.map((entry) => (100 / getRecommendations(entry)[0].rate) * activeDelivery.quantity)
		const totalCatches = expectedCatches.reduce((total, catches) => total + catches, 0)
		const totalFish = targetFish.length * activeDelivery.quantity
		const averageCatches = totalCatches / totalFish
		const hasDiamond = targetFish.some((entry) => entry.rarity === 'Diamond')
		const tier = totalCatches < 75
			? 'Routine'
			: totalCatches < 250
				? 'Challenging'
				: totalCatches < 750 ? 'Hard' : 'Extreme'
		const adjustedTier = hasDiamond && activeDelivery.quantity >= 9 ? 'Extreme' : tier

		return { averageCatches, totalCatches, tier: adjustedTier, totalFish }
	})() : null

	return (
		<section className="delivery" aria-labelledby="delivery-title">
			<header className="delivery__header">
				<div>
					<p className="eyebrow">PyroFishing route planner</p>
					<h1 id="delivery-title">Deliveries</h1>
					<p className="delivery__intro">
						Build a fish list and find the strongest order of biomes to visit.
					</p>
				</div>
				<button className="delivery__add" type="button" onClick={addDelivery}>+ New delivery</button>
			</header>

			<div className="delivery__layout">
				<aside className="delivery-sidebar">
					<div className="delivery-sidebar__heading">
						<span>Plans</span>
						<strong>{deliveries.length}</strong>
					</div>
					{deliveries.map((delivery) => (
						<button
							className={`delivery-plan ${delivery.id === activeDeliveryId ? 'delivery-plan--active' : ''}`}
							key={delivery.id}
							type="button"
							 onClick={() => {
								setActiveDeliveryId(delivery.id)
								setQuantityInput(String(delivery.quantity))
							}}
						>
							<strong>{delivery.name || 'Untitled delivery'}</strong>
							<span>{delivery.targets.length} fish types</span>
						</button>
					))}
				</aside>

				<div className="delivery-workspace">
				<form className="delivery-form" onSubmit={addFish}>
					<div className="delivery-form__heading">
						<span className="form-step">01</span>
						<div>
							<h2>Build your fish list</h2>
						</div>
					</div>
					<label>
						Delivery name
						<input value={activeDelivery.name} onChange={(event) => updateDeliveryName(event.target.value)} />
					</label>
					<label>
						Fish required per type
						<input type="number" min="1" value={quantityInput} onChange={(event) => updateQuantity(event.target.value)} onBlur={commitQuantity} />
					</label>
					<div className="fish-picker">
						<label htmlFor="fish-select">Fish target</label>
						<div>
							<select id="fish-select" value={selectedFish} onChange={(event) => setSelectedFish(event.target.value)}>
								<option value="">Choose a fish...</option>
								{fishByRarity.map((group) => (
									<optgroup label={`${group.rarity} (${group.fish.length})`} key={group.rarity}>
										{group.fish.map((entry) => (
											<option value={entry.name} key={entry.name} disabled={activeDelivery.targets.includes(entry.name)}>
												{entry.name}{activeDelivery.targets.includes(entry.name) ? ' - added' : ''}
											</option>
										))}
									</optgroup>
								))}
							</select>
							<button type="submit">Add fish</button>
						</div>
					</div>
					<div className="target-list">
						{targetFish.length === 0 && <p className="target-list__empty">Your fish targets will appear here.</p>}
						{targetFish.map((entry) => (
							<div className="target-row" key={entry.name}>
								<span>{entry.name}</span>
								<button type="button" aria-label={`Remove ${entry.name}`} onClick={() => removeFish(entry.name)}>Remove</button>
							</div>
						))}
					</div>
				</form>

				<div className="delivery-results">
					<div className="delivery-results__heading">
						<div>
							<p className="eyebrow">Route guidance</p>
										<h2>{activeDelivery.name || 'Untitled delivery'}</h2>
						</div>
						{deliveries.length > 1 && <button type="button" onClick={() => removeDelivery(activeDelivery.id)}>Delete plan</button>}
					</div>
					{targetFish.length === 0 ? (
						<div className="delivery-empty">
							<span className="delivery-empty__mark">+</span>
							<h2>Add fish to see your route</h2>
						</div>
					) : (
						<>
							<div className={`delivery-difficulty delivery-difficulty--${difficulty.tier.toLowerCase()}`}>
								<div>
									<span className="delivery-difficulty__label">Delivery difficulty</span>
									<strong>{difficulty.tier}</strong>
								</div>
								<span>~{Math.round(difficulty.averageCatches)} catches per fish</span>
								<span>~{Math.round(difficulty.totalCatches)} catches for {difficulty.totalFish} fish</span>
							</div>
							<div className="route-list">
								{route.map((stop, index) => (
									<div className="route-stop" key={stop.biome}>
										<span className="route-stop__number">{String(index + 1).padStart(2, '0')}</span>
										<div>
											<strong>{stop.biome}</strong>
												<span className="route-stop__label">Catchable fish and base rates</span>
											<ul>
												{stop.fishNames.map((fishName) => {
													const entry = fish.find((candidate) => candidate.name === fishName)

													return (
														<li key={fishName}>
															<span>{fishName}</span>
															<b>{formatRate(getRateForBiome(entry, stop.biome))}</b>
														</li>
													)
												})}
											</ul>
										</div>
									</div>
								))}
							</div>
							<div className="recommendation-list">
								<h3>Per-fish recommendations</h3>
								{targetFish.map((entry) => (
									<div className="recommendation-row" key={entry.name}>
										<strong>{entry.name} x{activeDelivery.quantity}</strong>
										<div>{getRecommendations(entry).map((recommendation) => <span key={recommendation.biome}>{recommendation.biome} <b>{formatRate(recommendation.rate)}</b></span>)}</div>
									</div>
								))}
							</div>
						</>
					)}
				</div>
				</div>
			</div>
		</section>
	)
}

export default Delivery
