import { useCallback } from "preact/hooks";
import { GeoJSONStoreFeatures } from "terra-draw";

export function localStorageStore() {
    const clearLocalStorage = useCallback(() => {
        if (localStorage) {
            localStorage.removeItem("terra-draw");
        }
    }, [])

    const setLocalStorage = useCallback((snapshot: GeoJSONStoreFeatures[]) => {
        if (localStorage) {
            localStorage.setItem("terra-draw", JSON.stringify(snapshot));
        }
    }, [])

    const getLocalStorage = useCallback(() => {
        if (localStorage) {
            return localStorage.getItem("terra-draw");
        }

        return null
    }, [])


    return {
        clearLocalStorage,
        setLocalStorage,
        getLocalStorage
    }

}