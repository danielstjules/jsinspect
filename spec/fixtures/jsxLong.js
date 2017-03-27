class Fixture {
  render () {
    return (
      <View style={Styles.container}>
        <View style={Styles.content}>
          <Animatable.View ref='content' animation='fadeInUp' duration={2000} ease='ease-in'>
            <LinearGradient
              start={{x: 0.0, y: 0.0}} end={{x: 0.0, y: 1.0}}
              locations={[0, 1]}
              colors={['#074595', '#6589A4']}
              style={Styles.signInContainer}
            >
              {this.renderTitle()}
              {this.renderMeetingId()}
              {this.renderPasscode()}
              {this.renderUsernameInput()}
              {this.renderDropdown()}
              {this.renderJoinButton()}
              {/* this.renderSignIn() */}
            </LinearGradient>
          </Animatable.View>
        </View>
      </View>
    )
  }

  render () {
    return (
      <Animatable.View ref='container' style={Styles.container} easing='ease-in'>
        <LinearGradient
          start={{x: 0.0, y: 0.0}} end={{x: 0.0, y: 1.0}}
          locations={[0, 1]}
          colors={['#074595', '#6589A4']}
          style={Styles.blurOverlay}>
          <View style={Styles.content}>
            {this.renderLogo()}
            {this.renderErrorMessage()}
            {this.renderUsernameInput()}
            {this.renderPasswordInput()}
            {this.renderNextButton()}
            {this.renderSignInOptions()}
            {this.renderSignUp()}
          </View>
        </LinearGradient>
      </Animatable.View>
    )
  }
}
