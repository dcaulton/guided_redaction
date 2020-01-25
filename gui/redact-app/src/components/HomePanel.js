import React from 'react';

class HomePanel extends React.Component {
// TODO ===================================================
// TODO ===================================================
// TODO ===================================================
// merge ImageMovieForm with this.  This is just silly
// TODO ===================================================
// TODO ===================================================
// TODO ===================================================

  render() {
    return (
      <div id='home_panel'>
        <div className='col md-6'>
          <div className='row mt-5'>
            <p>To start work you will need to specify a movie or image.  Please use this form to indicate the url where the asset can be accessed.</p>
            <p>After you have specified the input image or movie, press the Movie Parser link above if it's a movie, otherwise press the Image Redactor link above</p>
          </div>
          <hr />
          <div className='row'>
            <ImageMovieForm 
              setMovieUrlCallback = {this.props.setMovieUrlCallback}
              setImageUrl={this.props.setImageUrl}
              showMovieParserLink = {this.props.showMovieParserLink}
              checkIfApiCanSeeUrl={this.props.checkIfApiCanSeeUrl}
              checkIfGuiCanSeeUrl={this.props.checkIfGuiCanSeeUrl}
              callMakeUrl={this.props.callMakeUrl}
              updateSingleImageMovie={this.props.updateSingleImageMovie}
              setMovies={this.props.setMovies}
            />
          </div>
        </div>
      </div>
    );
  }
}

class ImageMovieForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      image_or_movie: '', 
      image_url: this.props.image_url,
      apiCanSeeUrl: false,
      guiCanSeeUrl: false,
      formUrl: '',
    }
    this.handleSubmit = this.handleSubmit.bind(this)
    this.toggleImageOrMovie = this.toggleImageOrMovie.bind(this)
    this.setUrl = this.setUrl.bind(this)
    this.apiCanSeeUrlWhenDone=this.apiCanSeeUrlWhenDone.bind(this)
    this.guiCanSeeUrlWhenDone=this.guiCanSeeUrlWhenDone.bind(this)
    this.updateImageOrMovie=this.updateImageOrMovie.bind(this)
  }

  componentDidMount() {
    document.getElementById('url_input').style.display = 'block'
    document.getElementById('submit_button').disabled = true
    if (!this.props.showMovieParserLink) {
      document.getElementById('input_type_image').checked = true
    }
  }

  updateImageOrMovie(call_make_url_response) {
  // called after we make a local copy of the image or movie and need to update
  // the main data structures for imagePanel and MoviePanel to this new url
    const the_url = call_make_url_response['url']
    if (this.state.image_or_movie === 'image') {
      this.props.setMovies({})
      this.props.setImageUrl(the_url)
      this.props.updateSingleImageMovie(the_url)
    } else {
      this.props.setMovies({})
      this.props.setMovieUrlCallback(the_url)
    }
  }

  handleSubmit(event) {
    if (!this.state.apiCanSeeUrl) {
      this.props.callMakeUrl(this.state.formUrl, this.updateImageOrMovie)
    }
    let link_to_next_page = ''
    if (this.state.image_or_movie === 'image') {
      link_to_next_page = document.getElementById('image_panel_link')
    } else if (this.state.image_or_movie === 'movie') {
      link_to_next_page = document.getElementById('movie_panel_link')
    } 
    link_to_next_page.click()
  }

  toggleImageOrMovie(event) {
    let image_ele = document.getElementById('input_type_image')
    let movie_ele = document.getElementById('input_type_movie')
    let url_label_ele = document.getElementById('url_input_label')
    let the_value = event.target.value

    if (the_value === 'image') {
      image_ele.checked = true;
      movie_ele.checked = false;
      url_label_ele.innerHTML = 'Image URL'
    } else {
      image_ele.checked = false;
      movie_ele.checked = true;
      url_label_ele.innerHTML = 'Movie URL'
    }
    this.setState({
      image_or_movie: the_value,
    })
  }

  apiCanSeeUrlWhenDone(response) {
    this.setState({
      apiCanSeeUrl: response.can_reach,
    })
  }

  guiCanSeeUrlWhenDone(response) {
    this.setState({
      guiCanSeeUrl: response.can_reach,
    })
  }

  setUrl(event) {
    this.setState({
      formUrl: event.target.value,
    })
    this.props.checkIfApiCanSeeUrl(event.target.value, this.apiCanSeeUrlWhenDone)
    this.props.checkIfGuiCanSeeUrl(event.target.value, this.guiCanSeeUrlWhenDone)

    if (this.state.image_or_movie === 'image') {
      this.props.setImageUrl(event.target.value)
    } else {
      this.props.setMovieUrlCallback(event.target.value)
      this.props.setMovies({})
    }
    document.getElementById('submit_button').disabled = false
  }
  
  buildMediaPreview() {
    if (!this.state.formUrl) {
      return
    }
    if (this.state.guiCanSeeUrl) {
      return (
      <h5>Looking Good - Media is reachable at specified url</h5>
      )
    }
    return (
      <h5>Error: Media unreachable at specified url</h5>
    )
  }

  render() {
    const media_preview = this.buildMediaPreview()
    return (
      <div className='col'>
        <div className='row'>
          <div className="form-group">
            <div className='form-check'>
              <h5>Input Type</h5>
              <input
                  className="form-check-input"
                  type="radio"
                  name="form_radio"
                  id="input_type_image"
                  value="image" 
                  onChange={this.toggleImageOrMovie} 
              />
              <label className="form-check-label" htmlFor="input_type_image" >
                Image
              </label>
            </div>
            <div className='form-check'>
              <input
                  className="form-check-input"
                  type="radio"
                  name="form_radio"
                  id="input_type_movie"
                  value="movie" 
                  onChange={this.toggleImageOrMovie} 
              />
              <label className="form-check-label" htmlFor="input_type_movie" >
                Movie
              </label>
            </div>
          </div>
        </div>
        <div className='row'>
          <div className="form-group" id='url_input'>
            <label htmlFor="imageMovieUrl" id='url_input_label'>Image/Movie URL</label>
            <input 
                type="text"
                className="form-control"
                size='90'
                id="imageMovieUrl" 
                onChange={this.setUrl}
            />
          </div>
        </div>
        <div className='row'>
          <button
              className='btn btn-primary'
              id='submit_button'
              onClick={this.handleSubmit}
          >
            Submit
          </button>
        </div>
        <div className='row m-5'>
          {media_preview}
        </div>
      </div>
    )
  }
}

export default HomePanel;
