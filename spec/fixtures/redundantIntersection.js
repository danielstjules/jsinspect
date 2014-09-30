function intersectionA(array1, array2) {
  var fn = function(array1, array2) {
    array1.filter(function(n) {
      return array2.indexOf(n) != -1;
    });
  };

  fn(array1, arary2);
}

function intersectionB(arrayA, arrayB) {
  var fn = function(arrayA, arrayB) {
    arrayA.filter(function(n) {
      return arrayB.indexOf(n) != -1;
    });
  };

  fn(arrayA, arrayB);
}
