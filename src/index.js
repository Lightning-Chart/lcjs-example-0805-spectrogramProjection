/*
 * LightningChartJS example for Chart with 2D spectrogram + dynamic projections on mouse interaction.
 */
// Import LightningChartJS
const lcjs = require('@lightningchart/lcjs')

// Extract required parts from LightningChartJS.
const {
    lightningChart,
    PalettedFill,
    LUT,
    emptyFill,
    emptyLine,
    AxisScrollStrategies,
    synchronizeAxisIntervals,
    regularColorSteps,
    Themes,
    LegendPosition,
} = lcjs

const { createSpectrumDataGenerator } = require('@lightningchart/xydata')

const spectrogramColumns = 1024
const spectrogramRows = 1024

// Create charts and series.

// NOTE: Using `Dashboard` is no longer recommended for new applications. Find latest recommendations here: https://lightningchart.com/js-charts/docs/more-guides/grouping-charts/
const dashboard = lightningChart({
            resourcesBaseUrl: new URL(document.head.baseURI).origin + new URL(document.head.baseURI).pathname + 'resources/',
        })
    .Dashboard({
        theme: (() => {
    const t = Themes[new URLSearchParams(window.location.search).get('theme') || 'darkGold'] || undefined
    const smallView = Math.min(window.innerWidth, window.innerHeight) < 500
    if (!window.__lcjsDebugOverlay) {
        window.__lcjsDebugOverlay = document.createElement('div')
        window.__lcjsDebugOverlay.style.cssText = 'position:fixed;top:0;left:0;background:rgba(0,0,0,0.7);color:#fff;padding:4px 8px;z-index:99999;font:12px monospace;pointer-events:none'
        if (document.body) document.body.appendChild(window.__lcjsDebugOverlay)
        setInterval(() => {
            if (!window.__lcjsDebugOverlay.parentNode && document.body) document.body.appendChild(window.__lcjsDebugOverlay)
            window.__lcjsDebugOverlay.textContent = window.innerWidth + 'x' + window.innerHeight + ' dpr=' + window.devicePixelRatio + ' small=' + (Math.min(window.innerWidth, window.innerHeight) < 500)
        }, 500)
    }
    return t && smallView ? lcjs.scaleTheme(t, 0.5) : t
})(),
        numberOfColumns: 2,
        numberOfRows: 2,
    })
    .setColumnWidth(0, 1)
    .setColumnWidth(1, 0.2)
    .setRowHeight(0, 1)
    .setRowHeight(1, 0.3)

const chartSpectrogram = dashboard
    .createChartXY({
        columnIndex: 0,
        rowIndex: 0,
        legend: { 
            position: LegendPosition.TopCenter
        },
    })
    .setTitle('2D Spectrogram with X & Y projection on mouse hover')

const theme = dashboard.getTheme()
const seriesSpectrogram = chartSpectrogram
    .addHeatmapGridSeries({
        columns: spectrogramColumns,
        rows: spectrogramRows,
    })
    .setPointerEvents(false)
    .setWireframeStyle(emptyLine)
    .setFillStyle(
        new PalettedFill({
            lookUpProperty: 'value',
            lut: new LUT({
                interpolate: true,
                steps: regularColorSteps(0, 1, theme.examples.spectrogramColorPalette),
            }),
        }),
    )

const chartProjectionY = dashboard
    .createChartXY({
        columnIndex: 1,
        rowIndex: 0,
        legend: { visible: false },
    })
    .setTitleFillStyle(emptyFill)
    // NOTE: Hardcoded alignment with Spectrogram chart.
    .setPadding({ top: 110 })
    .setUserInteractions(undefined)

chartProjectionY.getDefaultAxisY().setScrollStrategy(undefined)

// Sync projection Axis with spectogram chart projected axis.
synchronizeAxisIntervals(chartSpectrogram.getDefaultAxisY(), chartProjectionY.getDefaultAxisY())

chartProjectionY.getDefaultAxisX().setScrollStrategy(AxisScrollStrategies.expansion).setInterval({ start: 0, end: 1, stopAxisAfter: false })

const seriesProjectionY = chartProjectionY.addLineSeries({}).setName('Projection (Y)')

const chartProjectionX = dashboard
    .createChartXY({
        columnIndex: 0,
        rowIndex: 1,
        legend: { visible: false },
    })
    .setTitleFillStyle(emptyFill)
    .setUserInteractions(undefined)
chartProjectionX.getDefaultAxisX().setScrollStrategy(undefined)

// Sync projection Axis with spectogram chart projected axis.
synchronizeAxisIntervals(chartSpectrogram.getDefaultAxisX(), chartProjectionX.getDefaultAxisX())

chartProjectionX.getDefaultAxisY().setScrollStrategy(AxisScrollStrategies.expansion).setInterval({ start: 0, end: 1, stopAxisAfter: false })
const seriesProjectionX = chartProjectionX.addLineSeries({}).setName('Projection (X)')

// Align charts nicely.
chartSpectrogram.getDefaultAxisY().setThickness(50)
chartProjectionX.getDefaultAxisY().setThickness(50)
chartSpectrogram.getDefaultAxisX().setThickness(25)
chartProjectionY.getDefaultAxisX().setThickness(25)

// Generate data.
createSpectrumDataGenerator()
    .setNumberOfSamples(spectrogramColumns)
    .setSampleSize(spectrogramRows)
    .generate()
    .toPromise()
    .then((data) => {
        seriesSpectrogram.invalidateIntensityValues(data)

        const showProjection = (axisX, axisY) => {
            // Calculate spectrogram 1D projections at axis location for both X and Y planes.
            let projectionY
            try {
                projectionY = data[Math.round(axisX)].map((value, i) => ({
                    x: value,
                    y: i,
                }))
            } catch (e) {}

            let projectionX
            try {
                projectionX = []
                const row = Math.round(axisY)
                for (let x = 0; x < spectrogramColumns; x += 1) {
                    projectionX[x] = {
                        x,
                        y: data[x][row],
                    }
                }
            } catch (e) {}

            // Update projection series data.
            seriesProjectionY.clear()
            if (projectionY) {
                seriesProjectionY.appendJSON(projectionY)
            }

            seriesProjectionX.clear()
            if (projectionX) {
                seriesProjectionX.appendJSON(projectionX)
            }
        }

        // Add custom interaction when mouse is hovered over spectrogram chart.
        chartSpectrogram.seriesBackground.addEventListener('pointermove', (event) => {
            // Solve mouse location on Axis.
            const locationAxis = chartSpectrogram.translateCoordinate(event, chartSpectrogram.coordsAxis)
            showProjection(locationAxis.x, locationAxis.y)
        })

        showProjection(spectrogramColumns / 2, spectrogramRows / 2)
    })
