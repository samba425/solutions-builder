const saved = localStorage.getItem('cytoscape-canvas');
if (saved) {
  const data = JSON.parse(saved);
  console.log('Nodes:', data.elements.filter(e => e.group === 'nodes').map(n => ({
    id: n.data.id,
    service: n.data.service,
    isShape: n.data.isShape,
    faIcon: n.data.faIcon,
    icon: n.data.icon
  })));
}
