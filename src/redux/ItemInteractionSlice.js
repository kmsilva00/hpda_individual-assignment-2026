import { createSlice } from '@reduxjs/toolkit'

export const itemInteractionSlice = createSlice({
  name: 'itemInteraction',
  initialState: {
    selectedItems: [],
    hoveredItems: [],
  },
  reducers: {
    setSelectedItems: (state, action) => {
      return { ...state, selectedItems: action.payload };
    },
    setHoveredItems: (state, action) => {
      return { ...state, hoveredItems: action.payload };
    },
  },
})

export const { setSelectedItems, setHoveredItems } = itemInteractionSlice.actions
export default itemInteractionSlice.reducer