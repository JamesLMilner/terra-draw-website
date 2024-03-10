import { GeoJSONStoreFeatures } from "terra-draw";

export function stripSnapshot(snapshot: GeoJSONStoreFeatures[]): GeoJSONStoreFeatures[] {
    return snapshot.filter((feature) => {
        return !feature.properties.selectionPoint && !feature.properties.midPoint
    }).map((feature) => {
        if (feature.properties.selected) {
            feature.properties.selected = false
        }
        return feature
    })
}