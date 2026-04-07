import * as d3 from 'd3'

class ScatterplotD3 {
    margin = { top: 40, right: 20, bottom: 60, left: 80 };
    size;
    height;
    width;
    svg;
    xScale;
    yScale;
    brush;
    defaultOpacity = 0.5;
    defaultRadius = 3;
    highlightRadius = 5;
    transitionDuration = 400;
    _programmaticClear = false;
    controllerMethods = {};

    constructor(el) {
        this.el = el;
    }

    create(config) {
        this.size = config.size;
        this.width = this.size.width - this.margin.left - this.margin.right;
        this.height = this.size.height - this.margin.top - this.margin.bottom;

        this.svg = d3.select(this.el)
            .append("svg")
            .attr("width", this.size.width)
            .attr("height", this.size.height)
            .append("g")
            .attr("class", "svgG")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        this.xScale = d3.scaleLinear().range([0, this.width]);
        this.yScale = d3.scaleLinear().range([this.height, 0]);

        this.svg.append("g").attr("class", "xAxisG")
            .attr("transform", `translate(0,${this.height})`);
        this.svg.append("g").attr("class", "yAxisG");

        this.svg.append("text").attr("class", "xLabel")
            .attr("x", this.width / 2)
            .attr("y", this.height + 45)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("fill", "#a0aec0");

        this.svg.append("text").attr("class", "yLabel")
            .attr("transform", "rotate(-90)")
            .attr("x", -this.height / 2)
            .attr("y", -55)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("fill", "#a0aec0");

        this.svg.append("g").attr("class", "brushG");
    }

    updateAxes(visData, xAttr, yAttr) {
        const xMin = d3.min(visData, d => d._x);
        const xMax = d3.max(visData, d => d._x);
        const yMin = d3.min(visData, d => d._y);
        const yMax = d3.max(visData, d => d._y);

        const xPad = (xMax - xMin) * 0.05 || 0.05;
        const yPad = (yMax - yMin) * 0.05 || 0.05;

        this.xScale.domain([xMin - xPad, xMax + xPad]);
        this.yScale.domain([yMin - yPad, yMax + yPad]);

        this.svg.select(".xAxisG")
            .transition().duration(this.transitionDuration)
            .call(d3.axisBottom(this.xScale).ticks(6).tickFormat(d3.format(".1f")));

        this.svg.select(".yAxisG")
            .transition().duration(this.transitionDuration)
            .call(d3.axisLeft(this.yScale).ticks(6).tickFormat(d3.format(".1f")));

        this.svg.select(".xLabel").text(xAttr);
        this.svg.select(".yLabel").text(yAttr);
    }

    _showTooltip(event, html) {
        const tooltip = document.getElementById("vis-tooltip");
        if (!tooltip) return;
        tooltip.style.display = "block";
        tooltip.style.left = (event.clientX + 14) + "px";
        tooltip.style.top = (event.clientY - 32) + "px";
        tooltip.innerHTML = html;
    }

    _hideTooltip() {
        const tooltip = document.getElementById("vis-tooltip");
        if (tooltip) tooltip.style.display = "none";
    }

    renderScatterplot(visData, xAttr, yAttr, controllerMethods) {
        if (!visData || visData.length === 0) return;

        // Store on instance so event handlers always call the latest version
        this.controllerMethods = controllerMethods;
        this._xAttr = xAttr;
        this._yAttr = yAttr;

        const validData = visData
            .map(d => ({ ...d, _x: parseFloat(d[xAttr]), _y: parseFloat(d[yAttr]) }))
            .filter(d => !isNaN(d._x) && !isNaN(d._y));

        this.updateAxes(validData, xAttr, yAttr);

        this.svg.selectAll(".markerG")
            .data(validData, d => d.index)
            .join(
                enter => {
                    const g = enter.append("g")
                        .attr("class", "markerG")
                        .style("opacity", this.defaultOpacity);

                    g.append("circle")
                        .attr("class", "markerCircle")
                        .attr("r", this.defaultRadius)
                        .attr("fill", "#e74c3c")
                        .attr("stroke", "#ff6b6b")
                        .attr("stroke-width", 0);

                    g.attr("transform", d =>
                        `translate(${this.xScale(d._x)},${this.yScale(d._y)})`
                    );
                    return g;
                },
                update => {
                    update.transition().duration(this.transitionDuration)
                        .attr("transform", d =>
                            `translate(${this.xScale(d._x)},${this.yScale(d._y)})`
                        );
                    return update;
                },
                exit => exit.remove()
            );

        // Attach hover events to all dots (enter + update) after the join
        this.svg.selectAll(".markerG")
            .on("mouseover", (event, d) => {
                this.controllerMethods.handleHover?.([d]);
                this._showTooltip(event,
                    `<strong>${d.communityname || '?'}</strong><br/>
                     State: ${d.state || '?'}<br/>
                     ${this._xAttr}: ${parseFloat(d[this._xAttr]).toFixed(3)}<br/>
                     ${this._yAttr}: ${parseFloat(d[this._yAttr]).toFixed(3)}`
                );
            })
            .on("mouseleave", () => {
                this.controllerMethods.handleHoverEnd?.();
                this._hideTooltip();
            });

        this.brush = d3.brush()
            .extent([[0, 0], [this.width, this.height]])
            .on("end", event => {
                // Ignore events triggered by clearBrush() to prevent infinite loop
                if (this._programmaticClear) return;

                if (!event.selection) {
                    this.controllerMethods.handleBrushSelection([]);
                    return;
                }
                const [[x0, y0], [x1, y1]] = event.selection;
                const xMin = this.xScale.invert(x0);
                const xMax = this.xScale.invert(x1);
                const yMin = this.yScale.invert(y1);
                const yMax = this.yScale.invert(y0);

                const selected = [];
                this.svg.selectAll(".markerG").each(function(d) {
                    if (d._x >= xMin && d._x <= xMax && d._y >= yMin && d._y <= yMax) {
                        selected.push(d);
                    }
                });
                this.controllerMethods.handleBrushSelection(selected);
            });

        this.svg.select(".brushG").call(this.brush);
    }

    highlightSelectedItems(selectedItems) {
        if (!this.svg) return;

        if (!selectedItems || selectedItems.length === 0) {
            this.svg.selectAll(".markerG")
                .style("opacity", this.defaultOpacity)
                .select(".markerCircle")
                .attr("r", this.defaultRadius)
                .attr("stroke-width", 0);
            return;
        }

        const selectedIndices = new Set(selectedItems.map(d => d.index));
        this.svg.selectAll(".markerG")
            .style("opacity", d => selectedIndices.has(d.index) ? 1 : 0.1)
            .select(".markerCircle")
            .attr("r", d => selectedIndices.has(d.index) ? this.highlightRadius : this.defaultRadius)
            .attr("stroke-width", d => selectedIndices.has(d.index) ? 1.5 : 0);
    }

    highlightHoveredItems(hoveredItems, selectedItems) {
        if (!this.svg) return;

        if (!hoveredItems || hoveredItems.length === 0) {
            this.highlightSelectedItems(selectedItems);
            return;
        }

        const hoveredIndices = new Set(hoveredItems.map(d => d.index).filter(i => i !== undefined));
        const selectedIndices = new Set((selectedItems || []).map(d => d.index));

        this.svg.selectAll(".markerG")
            .style("opacity", d => {
                if (hoveredIndices.has(d.index)) return 1;
                if (selectedIndices.has(d.index)) return 0.6;
                return 0.05;
            })
            .select(".markerCircle")
            .attr("r", d => hoveredIndices.has(d.index) ? this.highlightRadius + 2 : this.defaultRadius)
            .attr("stroke-width", d => hoveredIndices.has(d.index) ? 2 : 0);
    }

    clearBrush() {
        if (this.brush && this.svg) {
            try {
                this._programmaticClear = true;
                this.svg.select(".brushG").call(this.brush.move, null);
            } catch(e) {}
            this._programmaticClear = false;
        }
        this._hideTooltip();
    }

    clear() {
        d3.select(this.el).selectAll("*").remove();
    }
}

export default ScatterplotD3;
