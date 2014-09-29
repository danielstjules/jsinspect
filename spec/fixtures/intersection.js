function intersectionA(array1, array2) {
  array1.filter(function(n) {
    return array2.indexOf(n) != -1;
  });
}

function intersectionB(arrayA, arrayB) {
  arrayA.filter(function(n) {
    return arrayB.indexOf(n) != -1;
  });
}
