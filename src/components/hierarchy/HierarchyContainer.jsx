import './Hierarchy.css'
import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import HierarchyD3 from './Hierarchy-d3';
import { setSelectedItems, setHoveredItems } from '../../redux/ItemInteractionSlice';

function HierarchyContainer() {
    const visData = useSelector(state => state.dataSet);
    const selectedItems = useSelector(state => state.itemInteraction.selectedItems);
    const hoveredItems = useSelector(state => state.itemInteraction.hoveredItems);
    const dispatch = useDispatch();

    const [layout, setLayout] = useState('treemap');
    const divContainerRef = useRef(null);
    const hierarchyD3Ref = useRef(null);

    const selectedItemsRef = useRef(selectedItems);
    useEffect(() => {
        selectedItemsRef.current = selectedItems;
    }, [selectedItems]);

    const getChartSize = () => ({
        width: divContainerRef.current?.offsetWidth || 700,
        height: divContainerRef.current?.offsetHeight || 500,
    });

    useEffect(() => {
        const hierarchyD3 = new HierarchyD3(divContainerRef.current);
        hierarchyD3.create({ size: getChartSize() });
        hierarchyD3Ref.current = hierarchyD3;
        return () => {
            if (hierarchyD3Ref.current) hierarchyD3Ref.current.clear();
        };
    }, []);

    useEffect(() => {
        if (!visData || visData.length === 0) return;
        if (!hierarchyD3Ref.current) return;

        const controllerMethods = {
            handleStateClick: (communities) => {
                dispatch(setSelectedItems(communities || []));
            },
            handleAddToSelection: (communities) => {
                if (!communities || communities.length === 0) return;
                const current = selectedItemsRef.current || [];
                const existingIndices = new Set(current.map(d => d.index));
                const clickedIndices = new Set(communities.map(c => c.index));
                const allAlreadySelected = communities.every(c => existingIndices.has(c.index));

                if (allAlreadySelected) {
                    dispatch(setSelectedItems(
                        current.filter(d => !clickedIndices.has(d.index))
                    ));
                } else {
                    dispatch(setSelectedItems([
                        ...current,
                        ...communities.filter(c => !existingIndices.has(c.index))
                    ]));
                }
            },
            handleHover: (items) => {
                dispatch(setHoveredItems(items || []));
            },
            handleHoverEnd: () => {
                dispatch(setHoveredItems([]));
            },
        };

        hierarchyD3Ref.current.renderHierarchy(visData, layout, controllerMethods);
    }, [visData, layout, dispatch]);

    useEffect(() => {
        if (!hierarchyD3Ref.current) return;
        hierarchyD3Ref.current.highlightSelectedItems(selectedItems);
    }, [selectedItems]);

    useEffect(() => {
        if (!hierarchyD3Ref.current) return;
        hierarchyD3Ref.current.highlightHoveredItems(hoveredItems);
    }, [hoveredItems]);

    return (
        <div className="hierarchyWrapper">
            <div className="layoutToggle">
                <button
                    className={layout === 'treemap' ? 'active' : ''}
                    onClick={() => setLayout('treemap')}
                >Treemap</button>
                <button
                    className={layout === 'sunburst' ? 'active' : ''}
                    onClick={() => setLayout('sunburst')}
                >Sunburst</button>
            </div>
            <div ref={divContainerRef} className="hierarchyDivContainer"></div>
        </div>
    );
}

export default HierarchyContainer;
