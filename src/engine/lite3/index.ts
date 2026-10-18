// The modelling kit's public face: the ported model code imports it as `THREE` and keeps its construction logic, while
// everything it makes is a PlayCanvas entity, mesh and material (see scene.ts).
export * from './math';
export * from './geometry';
export * from './scene';
