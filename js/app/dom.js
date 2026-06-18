export function getDom() {
  return {
    mapSourceTabs: document.getElementById('mapSourceTabs'),
    mapSourceNote: document.getElementById('mapSourceNote'),
    realEditor: document.getElementById('realEditor'),
    syntheticEditor: document.getElementById('syntheticEditor'),
    hospitalSelect: document.getElementById('hospitalSelect'),
    realNodeCount: document.getElementById('realNodeCount'),
    realHospitalCount: document.getElementById('realHospitalCount'),
    realInstruction: document.getElementById('realInstruction'),
    resetRealStartBtn: document.getElementById('resetRealStartBtn'),
    seedInput: document.getElementById('seedInput'),
    widthInput: document.getElementById('widthInput'),
    heightInput: document.getElementById('heightInput'),
    densityInput: document.getElementById('densityInput'),
    densityLabel: document.getElementById('densityLabel'),
    generateGridBtn: document.getElementById('generateGridBtn'),
    resetGridBtn: document.getElementById('resetGridBtn'),
    syntheticToolTabs: document.getElementById('syntheticToolTabs'),
    syntheticInstruction: document.getElementById('syntheticInstruction'),
    objectiveTabs: document.getElementById('objectiveTabs'),
    algorithmList: document.getElementById('algorithmList'),
    toggleAlgorithmsBtn: document.getElementById('toggleAlgorithmsBtn'),
    runBtn: document.getElementById('runBtn'),
    viewerGrid: document.getElementById('viewerGrid'),
    viewerTitle: document.getElementById('viewerTitle'),
    statusText: document.getElementById('statusText'),
    viewerFooter: document.getElementById('viewerFooter'),
    statePill: document.getElementById('statePill'),
    graphPill: document.getElementById('graphPill'),
    objectivePill: document.getElementById('objectivePill'),
    resultCards: document.getElementById('resultCards'),
    comparisonBody: document.getElementById('comparisonBody'),
    benchmarkPreview: document.getElementById('benchmarkPreview'),
    refreshBenchmarkBtn: document.getElementById('refreshBenchmarkBtn'),
    footerGraphInfo: document.getElementById('footerGraphInfo'),
  };
}

export function setActiveButton(container, selector, value, attrName) {
  container.querySelectorAll(selector).forEach((button) => {
    button.classList.toggle('active', button.dataset[attrName] === value);
  });
}
