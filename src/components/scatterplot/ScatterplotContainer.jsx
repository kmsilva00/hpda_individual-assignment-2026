import './Scatterplot.css'
import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import ScatterplotD3 from './Scatterplot-d3';
import { setSelectedItems, setHoveredItems } from '../../redux/ItemInteractionSlice';

function ScatterplotContainer({ xAttributeName, yAttributeName }) {
    const visData = useSelector(state => state.dataSet);
    const selectedItems = useSelector(state => state.itemInteraction.selectedItems);
    const hoveredItems = useSelector(state => state.itemInteraction.hoveredItems);
    const dispatch = useDispatch();

    const divContainerRef = useRef(null);
    const scatterplotD3Ref = useRef(null);

    const getChartSize = () => ({
        width: divContainerRef.current?.offsetWidth || 600,
        height: divContainerRef.current?.offsetHeight || 500,
    });

    useEffect(() => {
        const scatterplotD3 = new ScatterplotD3(divContainerRef.current);
        scatterplotD3.create({ size: getChartSize() });
        scatterplotD3Ref.current = scatterplotD3;
        return () => {
            if (scatterplotD3Ref.current) scatterplotD3Ref.current.clear();
        };
    }, []);

    useEffect(() => {
        if (!visData || visData.length === 0) return;
        if (!scatterplotD3Ref.current) return;

        const controllerMethods = {
            handleBrushSelection: (selected) => {
                dispatch(setSelectedItems(Array.isArray(selected) ? selected : []));
            },
            handleHover: (items) => {
                dispatch(setHoveredItems(items || []));
            },
            handleHoverEnd: () => {
                dispatch(setHoveredItems([]));
            },
        };

        scatterplotD3Ref.current.renderScatterplot(
            visData, xAttributeName, yAttributeName, controllerMethods
        );
    }, [visData, xAttributeName, yAttributeName, dispatch]);

    useEffect(() => {
        if (!scatterplotD3Ref.current) return;
        scatterplotD3Ref.current.highlightSelectedItems(selectedItems);
        if (!selectedItems || selectedItems.length === 0) {
            scatterplotD3Ref.current.clearBrush();
        }
    }, [selectedItems]);

    useEffect(() => {
        if (!scatterplotD3Ref.current) return;
        scatterplotD3Ref.current.highlightHoveredItems(hoveredItems, selectedItems);
    }, [hoveredItems, selectedItems]);

    return (
        <div ref={divContainerRef} className="scatterplotDivContainer"></div>
    );
}

export default ScatterplotContainer;
