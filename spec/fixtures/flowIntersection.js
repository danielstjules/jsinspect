function intersectionA(array1: array<Any>, array2: array<Any>): array<Any> {
  array1.filter(function(n) {
    return array2.indexOf(n) != -1;
  });
}

function intersectionB(arrayA: array<Any>, arrayB: array<Any>): array<Any> {
  arrayA.filter(function(n) {
    return arrayB.indexOf(n) != -1;
  });
}
