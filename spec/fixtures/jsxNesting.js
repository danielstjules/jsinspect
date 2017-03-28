<View>
  <Animatable.View ref='content' animation='fadeInUp' duration={2000} ease='ease-in'>
    <LinearGradient
      start={{x: 0.0, y: 0.0}} end={{x: 0.0, y: 1.0}}
      locations={[0, 1]}
      colors={['#074595', '#6589A4']}
      style={Styles.signInContainer}>
    </LinearGradient>
  </Animatable.View>

  <Animatable.View ref='container' style={Styles.container} easing='ease-in'>
    <LinearGradient
      start={{x: 0.0, y: 0.0}} end={{x: 0.0, y: 1.0}}
      locations={[0, 1]}
      colors={['#074595', '#6589A4']}
      style={Styles.blurOverlay}>
    </LinearGradient>
  </Animatable.View>
</View>
