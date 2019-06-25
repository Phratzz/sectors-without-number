import { createSelector } from 'reselect';

import { LAYER_NAME_LENGTH } from 'constants/defaults';
import {
  intersection,
  zipObject,
  keys,
  map,
  mapValues,
  sortBy,
  pick,
  pickBy,
  reduce,
} from 'constants/lodash';
import {
  currentEntitySelector,
  currentSectorSelector,
  layersSelector,
  layerFormSelector,
  layerRegionPaintSelector,
} from 'store/selectors/base.selectors';
import { isViewingSharedSector } from 'store/selectors/sector.selectors';
import { getSectorLayers } from 'store/selectors/entity.selectors';

export const isValidLayerForm = createSelector(
  [layerFormSelector],
  ({ name }) => !!name && name.length <= LAYER_NAME_LENGTH,
);

export const currentSectorLayers = createSelector(
  [currentSectorSelector, layersSelector, isViewingSharedSector],
  (sector, layers, isShared) =>
    pickBy(
      (layers || {})[sector] || {},
      ({ isHidden }) => !isShared || !isHidden,
    ),
);

export const currentLayer = createSelector(
  [currentSectorLayers, currentEntitySelector],
  (layers, current) => (layers || {})[current],
);

export const activeLayer = createSelector(
  [currentSectorLayers, getSectorLayers],
  (layers, sectorLayerMap) => {
    const syncedLayers = pick(sectorLayerMap, keys(layers || {}));
    const activeLayerId = reduce(
      syncedLayers,
      (active, layer, layerId) => (layer ? layerId : active),
      undefined,
    );
    return (layers || {})[activeLayerId];
  },
);

export const currentPaintRegion = createSelector(
  [currentLayer, layerRegionPaintSelector],
  (layer, regionPaint) => ((layer || {}).regions || {})[regionPaint],
);

export const visibleLayer = createSelector(
  [currentLayer, activeLayer, isViewingSharedSector],
  (current, active, isShared) => {
    const layer = current || active || {};
    const visibleRegions = pickBy(
      layer.regions || {},
      ({ isHidden }) => !isShared || !isHidden,
    );
    return {
      ...layer,
      regions: visibleRegions,
      hexes: mapValues(layer.hexes || {}, ({ regions }) => ({
        regions: intersection(regions, keys(visibleRegions)),
      })),
    };
  },
);

export const visibleLayerHexes = createSelector(
  [visibleLayer],
  layer => {
    const regionMap = (layer || {}).regions || {};
    const hexMap = (layer || {}).hexes || {};
    return zipObject(
      keys(hexMap),
      map(hexMap, ({ regions }) =>
        sortBy(regions.map(regionId => regionMap[regionId]).filter(r => r), [
          ({ name }) => name.toLowerCase(),
        ]),
      ),
    );
  },
);

export const visibleLayerHexColors = createSelector(
  [visibleLayerHexes],
  hexes => mapValues(hexes, list => list.map(({ color }) => color)),
);
