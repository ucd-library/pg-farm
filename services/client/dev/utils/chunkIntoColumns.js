/**
 * @description - Takes an array of items and chunks the items into columns
 * @param {Array} items - The array of items to chunk
 * @param {Number} columnCount - The number of columns 2, 3, or 4
 * @returns {Array} - An array of objects with the following structure:
 *  {
 *   class: the row class name,
 *   isFirstRow: boolean,
 *   isLastRow: boolean,
 *   columns: [
 *    {
 *     class: the column class name,
 *     item: the item
 *    }
 *   ]
 *  }
 */
export default (items, columnCount=2) => {
  const rowClasses = [
    {class: 'l-2col', count: 2},
    {class: 'l-3col', count: 3},
    {class: 'l-4col', count: 4}
  ];
  const columnClasses = [
    'l-first',
    'l-second',
    'l-third',
    'l-fourth'
  ];

  const rowClass = rowClasses.find(r => r.count == columnCount).class;

  return items.reduce((acc, item, currentIndex) => {
    const index = Math.floor(currentIndex / columnCount);
    if( !acc[index] ) {
      acc[index] = {
        class: rowClass,
        isFirstRow: index === 0,
        isLastRow: index === Math.ceil(items.length / columnCount) - 1,
        columns: []
      };
    }
    acc[index].columns.push({
      class: columnClasses[currentIndex % columnCount],
      item
    });
    return acc;
  }, []);


};
