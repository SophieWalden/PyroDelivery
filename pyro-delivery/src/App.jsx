import { useState, useEffect } from 'react'
import './App.css'
import Fishipedia from './assets/components/fishipedia.jsx'
import Delivery from './assets/components/delivery.jsx'

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("fish")

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}pyrofishing_data.json`)
      .then((response) => response.json())
      .then((jsonData) => {
        setData(jsonData);
        setLoading(false);
        console.log(jsonData);
      })
      .catch((error) => {
        console.error('Error loading json', error);
        setLoading(false);
      })
  }, []);

  return (
    <div>
      <div id="tab-holder">
        <span
          className={`tab-slider ${tab === "deliveries" ? "tab-slider--deliveries" : ""}`}
          aria-hidden="true"
        />
        <button
          className={`tab-button ${tab === "fish" ? "tab-button--active" : ""}`}
          onClick={() => setTab("fish")}
          type="button"
        >
          Fishipedia
        </button>
        <button
          className={`tab-button ${tab === "deliveries" ? "tab-button--active" : ""}`}
          onClick={() => setTab("deliveries")}
          type="button"
        >
          Deliveries
        </button>
      </div>
      <div id="site-content">
        {loading && <p className="content-status">Loading PyroFishing data...</p>}
        {!loading && data && tab === "fish" && <Fishipedia data={data} />}
        {!loading && data && tab === "deliveries" && <Delivery data={data} />}
        {!loading && !data && (
          <p className="content-status">The fishing data could not be loaded.</p>
        )}
      </div>
    </div>
  )
}

export default App
