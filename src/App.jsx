import './App.css';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getDataSet } from './redux/DataSetSlice';
import { setSelectedItems } from './redux/ItemInteractionSlice';
import ScatterplotContainer from './components/scatterplot/ScatterplotContainer';
import HierarchyContainer from './components/hierarchy/HierarchyContainer';

function SelectionInfo() {
    const selectedItems = useSelector(state => state.itemInteraction.selectedItems);

    if (!selectedItems || selectedItems.length === 0) return null;

    // Group by state
    const byState = {};
    selectedItems.forEach(d => {
        const key = `State ${d.state}`;
        if (!byState[key]) byState[key] = [];
        byState[key].push(d.communityname || '?');
    });

    const stateEntries = Object.entries(byState);
    const SHOW_STATES = 4;
    const visible = stateEntries.slice(0, SHOW_STATES);
    const hiddenStates = stateEntries.length - SHOW_STATES;

    return (
        <div className="selection-info">
            <span className="selection-count">{selectedItems.length} selected</span>
            {visible.map(([state, names]) => {
                const SHOW_NAMES = 3;
                const shown = names.slice(0, SHOW_NAMES).join(', ');
                const hiddenNames = names.length - SHOW_NAMES;
                return (
                    <span key={state} className="selection-state">
                        <span className="selection-state-label">{state}:</span>
                        {' '}{shown}
                        {hiddenNames > 0 && <span className="selection-more"> +{hiddenNames}</span>}
                    </span>
                );
            })}
            {hiddenStates > 0 && (
                <span className="selection-more">…and {hiddenStates} more state{hiddenStates > 1 ? 's' : ''}</span>
            )}
        </div>
    );
}

function App() {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(getDataSet());
    }, [dispatch]);

    return (
        <div className="App">
            <div className="app-header">
                <h1 className="app-title">US Communities Crime Explorer</h1>
                <button className="clearBtn" onClick={() => dispatch(setSelectedItems([]))}>
                    Clear Selection
                </button>
            </div>
            <SelectionInfo />
            <div className="row">
                <ScatterplotContainer
                    xAttributeName="medIncome"
                    yAttributeName="ViolentCrimesPerPop"
                />
                <HierarchyContainer />
            </div>
            <div id="vis-tooltip" className="vis-tooltip"></div>
        </div>
    );
}

export default App;