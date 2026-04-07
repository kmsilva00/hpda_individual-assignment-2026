import * as d3 from 'd3'

class HierarchyD3 {
    margin = { top: 40, right: 20, bottom: 20, left: 20 };
    size;
    width;
    height;
    svg;
    mainG;
    colorScale;
    currentLayout = 'treemap';
    transitionDuration = 600;
    selectedIndices = new Set();
    controllerMethods = {};

    constructor(el) {
        this.el = el;
    }

    create(config) {
        this.size = config.size;
        this.width = this.size.width - this.margin.left - this.margin.right;
        this.height = this.size.height - this.margin.top - this.margin.bottom;

        this.colorScale = d3.scaleSequential()
            .domain([1, 0])
            .interpolator(d3.interpolateRdYlGn)
            .clamp(true);

        this.svg = d3.select(this.el)
            .append("svg")
            .attr("width", this.size.width)
            .attr("height", this.size.height);

        this.mainG = this.svg.append("g")
            .attr("class", "mainG")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        this.svg.append("text")
            .attr("class", "hierTitle")
            .attr("x", this.size.width / 2)
            .attr("y", 24)
            .attr("text-anchor", "middle")
            .style("fill", "#a0aec0")
            .style("font-size", "13px")
            .text("States → Communities (size=population, color=crime rate)");
    }

    buildHierarchyData(visData) {
        const byState = d3.group(visData, d => d.state);

        const children = Array.from(byState, ([stateId, communities]) => {
            const validComms = communities.filter(d =>
                d.communityname && d.communityname !== '?' &&
                !isNaN(parseFloat(d.population)) &&
                !isNaN(parseFloat(d.ViolentCrimesPerPop))
            );
            if (validComms.length === 0) return null;

            const avgCrime = d3.mean(validComms, d => parseFloat(d.ViolentCrimesPerPop));

            return {
                name: `State ${stateId}`,
                stateId: stateId,
                avgCrime: avgCrime,
                children: validComms.map(d => ({
                    name: d.communityname,
                    population: parseFloat(d.population) || 0.01,
                    crime: parseFloat(d.ViolentCrimesPerPop),
                    stateId: stateId,
                    originalData: d,
                }))
            };
        }).filter(d => d !== null);

        return { name: "root", children };
    }

    getBaseOpacity(d) {
        if (!this.selectedIndices.size) return d.depth === 1 ? 0.7 : 0.85;
        if (d.depth === 1) return 0.4;
        return this.selectedIndices.has(d.data.originalData?.index) ? 1 : 0.1;
    }

    getBaseOpacityRect(d) {
        if (!this.selectedIndices.size) return 0.85;
        return this.selectedIndices.has(d.data.originalData?.index) ? 1 : 0.15;
    }

    handleClick(event, communities, controllerMethods) {
        const valid = (communities || []).filter(c => c && c.index !== undefined);
        const isMulti = event.ctrlKey || event.shiftKey || event.metaKey;
        if (isMulti) {
            controllerMethods.handleAddToSelection(valid);
        } else {
            controllerMethods.handleStateClick(valid);
        }
    }

    _showTooltip(event, html) {
        const tooltip = document.getElementById("vis-tooltip");
        if (!tooltip) return;
        tooltip.style.display = "block";
        tooltip.style.left = (event.pageX + 12) + "px";
        tooltip.style.top = (event.pageY - 28) + "px";
        tooltip.innerHTML = html;
    }

    _hideTooltip() {
        const tooltip = document.getElementById("vis-tooltip");
        if (tooltip) tooltip.style.display = "none";
    }

    renderTreemap(root, controllerMethods) {
        d3.treemap()
            .size([this.width, this.height])
            .paddingOuter(4)
            .paddingInner(2)
            .paddingTop(18)
            (root);

        const stateGroups = this.mainG.selectAll(".stateG")
            .data(root.children, d => d.data.stateId)
            .join(
                enter => {
                    const g = enter.append("g")
                        .attr("class", "stateG")
                        .style("cursor", "pointer");

                    g.append("rect")
                        .attr("class", "stateRect")
                        .attr("fill", "none")
                        .attr("stroke", "#4a5568")
                        .attr("stroke-width", 1.5)
                        .attr("rx", 2);

                    g.append("text")
                        .attr("class", "stateLabel")
                        .style("fill", "#cbd5e0")
                        .style("font-size", "10px")
                        .style("font-weight", "bold")
                        .style("cursor", "pointer")
                        .on("click", (event, d) => {
                            event.stopPropagation();
                            const communities = (d.children || [])
                                .map(c => c.data.originalData)
                                .filter(Boolean);
                            this.handleClick(event, communities, controllerMethods);
                        });

                    return g;
                },
                update => update,
                exit => exit.remove()
            );

        stateGroups.transition().duration(this.transitionDuration)
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        stateGroups.select(".stateRect")
            .transition().duration(this.transitionDuration)
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0);

        stateGroups.select(".stateLabel")
            .attr("x", 4).attr("y", 12)
            .text(d => d.data.name);

        stateGroups.each((stateNode, i, nodes) => {
            const stateG = d3.select(nodes[i]);
            const leaves = stateNode.children || [];

            stateG.selectAll(".communityRect")
                .data(leaves, d => d.data.originalData?.index)
                .join(
                    enter => enter.append("rect")
                        .attr("class", "communityRect")
                        .attr("rx", 1)
                        .style("cursor", "pointer")
                        .on("click", (event, d) => {
                            event.stopPropagation();
                            const community = d.data.originalData;
                            if (community && community.index !== undefined) {
                                this.handleClick(event, [community], controllerMethods);
                            }
                        })
                        .on("mouseenter", (event, d) => {
                            d3.select(event.currentTarget)
                                .attr("stroke", "#fff")
                                .attr("stroke-width", 1.5);
                            this._showTooltip(event,
                                `<strong>${d.data.name}</strong><br/>
                                 Crime: ${(d.data.crime * 100).toFixed(1)}%<br/>
                                 Population: ${(d.data.population * 100).toFixed(1)}%<br/>
                                 <em style="color:#a0aec0">Ctrl+Click to add</em>`
                            );
                            const community = d.data.originalData;
                            if (community) this.controllerMethods.handleHover?.([community]);
                        })
                        .on("mouseleave", (event, d) => {
                            d3.select(event.currentTarget)
                                .style("opacity", this.getBaseOpacityRect(d))
                                .attr("stroke", "none");
                            this._hideTooltip();
                            this.controllerMethods.handleHoverEnd?.();
                        }),
                    update => update,
                    exit => exit.remove()
                )
                .style("opacity", d => this.getBaseOpacityRect(d))
                .transition().duration(this.transitionDuration)
                .attr("x", d => d.x0 - stateNode.x0)
                .attr("y", d => d.y0 - stateNode.y0)
                .attr("width", d => d.x1 - d.x0)
                .attr("height", d => d.y1 - d.y0)
                .attr("fill", d => this.colorScale(d.data.crime));
        });
    }

    renderSunburst(root, controllerMethods) {
        const radius = Math.min(this.width, this.height) / 2;
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        d3.partition().size([2 * Math.PI, radius])(root);

        const arc = d3.arc()
            .startAngle(d => d.x0).endAngle(d => d.x1)
            .innerRadius(d => d.y0).outerRadius(d => d.y1 - 1);

        const nodes = root.descendants().filter(d => d.depth > 0);

        this.mainG.selectAll(".arcPath")
            .data(nodes, d => d.data.name + d.depth)
            .join(
                enter => enter.append("path").attr("class", "arcPath").style("opacity", 0),
                update => update,
                exit => exit.remove()
            )
            .attr("transform", `translate(${centerX},${centerY})`)
            .style("cursor", "pointer")
            .style("opacity", d => this.getBaseOpacity(d))
            .on("click", (event, d) => {
                if (d.depth === 2) {
                    const community = d.data.originalData;
                    if (community && community.index !== undefined) {
                        this.handleClick(event, [community], controllerMethods);
                    }
                } else if (d.depth === 1) {
                    const communities = (d.children || [])
                        .map(c => c.data.originalData)
                        .filter(c => c && c.index !== undefined);
                    this.handleClick(event, communities, controllerMethods);
                }
            })
            .on("mouseenter", (event, d) => {
                const crime = d.depth === 2
                    ? `${(d.data.crime * 100).toFixed(1)}%`
                    : `avg ${((d.data.avgCrime ?? 0) * 100).toFixed(1)}%`;
                this._showTooltip(event,
                    `<strong>${d.data.name}</strong><br/>Crime: ${crime}<br/>
                     <em style="color:#a0aec0">Ctrl+Click to add</em>`
                );
                if (d.depth === 2) {
                    const community = d.data.originalData;
                    if (community) this.controllerMethods.handleHover?.([community]);
                } else if (d.depth === 1) {
                    const communities = (d.children || [])
                        .map(c => c.data.originalData)
                        .filter(Boolean);
                    this.controllerMethods.handleHover?.(communities);
                }
            })
            .on("mouseleave", (_event, d) => {
                d3.select(_event.currentTarget).style("opacity", this.getBaseOpacity(d));
                this._hideTooltip();
                this.controllerMethods.handleHoverEnd?.();
            })
            .transition().duration(this.transitionDuration)
            .attr("d", arc)
            .attr("fill", d =>
                d.depth === 1
                    ? this.colorScale(d.data.avgCrime ?? 0.5)
                    : this.colorScale(d.data.crime ?? 0.5)
            )
            .attr("stroke", "#1a1a2e")
            .attr("stroke-width", 0.5);

        this.mainG.selectAll(".stateArcLabel")
            .data(root.children, d => d.data.stateId)
            .join(
                enter => enter.append("text").attr("class", "stateArcLabel"),
                update => update,
                exit => exit.remove()
            )
            .attr("transform", d => {
                const angle = (d.x0 + d.x1) / 2;
                const r = (d.y0 + d.y1) / 2;
                return `translate(${centerX + Math.sin(angle) * r},${centerY - Math.cos(angle) * r})`;
            })
            .attr("text-anchor", "middle")
            .style("fill", "#1a1a2e")
            .style("font-size", "8px")
            .style("font-weight", "bold")
            .style("pointer-events", "none")
            .text(d => (d.x1 - d.x0) > 0.2 ? d.data.name : "");
    }

    renderHierarchy(visData, layout, controllerMethods) {
        if (!visData || visData.length === 0) return;
        if (!this.mainG) return;

        // Store on instance so event handlers always call the latest version
        this.controllerMethods = controllerMethods;
        this.currentLayout = layout;
        this.mainG.selectAll("*").remove();

        const hierarchyData = this.buildHierarchyData(visData);
        const root = d3.hierarchy(hierarchyData)
            .sum(d => d.population || 0)
            .sort((a, b) => b.value - a.value);

        if (layout === 'treemap') {
            this.renderTreemap(root, controllerMethods);
        } else {
            this.renderSunburst(root, controllerMethods);
        }
    }

    highlightSelectedItems(selectedItems) {
        if (!this.mainG) return;

        this.selectedIndices = new Set(
            (selectedItems || [])
                .map(d => d.index)
                .filter(i => i !== undefined && i !== null)
        );

        if (!selectedItems || selectedItems.length === 0) {
            this.mainG.selectAll(".communityRect").style("opacity", 0.85);
            this.mainG.selectAll(".arcPath").style("opacity", d =>
                d.depth === 1 ? 0.7 : 0.85
            );
            return;
        }

        this.mainG.selectAll(".communityRect")
            .style("opacity", d => this.getBaseOpacityRect(d));
        this.mainG.selectAll(".arcPath")
            .style("opacity", d => this.getBaseOpacity(d));
    }

    highlightHoveredItems(hoveredItems) {
        if (!this.mainG) return;

        if (!hoveredItems || hoveredItems.length === 0) {
            // Restore selection-based highlighting
            this.mainG.selectAll(".communityRect")
                .style("opacity", d => this.getBaseOpacityRect(d));
            this.mainG.selectAll(".arcPath")
                .style("opacity", d => this.getBaseOpacity(d));
            return;
        }

        const hoveredIndices = new Set(
            hoveredItems.map(d => d.index).filter(i => i !== undefined)
        );

        this.mainG.selectAll(".communityRect")
            .style("opacity", d => {
                const idx = d.data.originalData?.index;
                return hoveredIndices.has(idx) ? 1 : 0.08;
            });

        this.mainG.selectAll(".arcPath")
            .style("opacity", d => {
                if (d.depth === 2) {
                    return hoveredIndices.has(d.data.originalData?.index) ? 1 : 0.08;
                }
                // depth === 1: highlight state if any child is hovered
                const anyChild = (d.children || [])
                    .some(c => hoveredIndices.has(c.data.originalData?.index));
                return anyChild ? 0.9 : 0.15;
            });
    }

    clear() {
        d3.select(this.el).selectAll("*").remove();
    }
}

export default HierarchyD3;
