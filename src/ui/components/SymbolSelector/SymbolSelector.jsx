import React, { useEffect, useState } from 'react';

const SymbolSelector = ({ onSelect }) => {
    const [symbols, setSymbols] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedSymbol, setSelectedSymbol] = useState('');

    useEffect(() => {
        setLoading(true);
        window.electronAPI.getBybitSymbols()
            .then((data) => {
                console.log('Symbols received in UI:', data);
                setSymbols(data);
                if (data.length > 0) {
                    setSelectedSymbol(data[0]);
                    onSelect(data[0]);
                }
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [onSelect]);

    const handleChange = (e) => {
        setSelectedSymbol(e.target.value);
        onSelect(e.target.value);
    };

    if (loading) return <div>Loading symbols...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <select value={selectedSymbol} onChange={handleChange} style={{ minWidth: 120 }}>
            {symbols.map(sym => (
                <option key={sym} value={sym}>
                    {sym}
                </option>
            ))}
        </select>
    );
};

export default SymbolSelector;
