import React from 'react';

class HomePanel extends React.Component {

  render() {
    return (
      <div id='home_panel'>
        <div className='col md-6'>
          <div className='row mt-5'>
            <p>To start work you will need to specify a movie or image.  Please use is form to either upload one or indicate the url where the asset can be accessed.</p>
            <p>After you have specified the input image or movie, press the Movie Parser link above if it's a movie, otherwise press the Image Redactor link above</p>
          </div>
          <hr />
          <div className='row'>
            <ImageMovieForm />
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
      file_or_url: '',
      asset_url: '',
      asset_file: '',
    }
    this.handleSubmit = this.handleSubmit.bind(this);
    this.toggleFileOrUrl= this.toggleFileOrUrl.bind(this);
    this.toggleImageOrMovie = this.toggleImageOrMovie.bind(this);
    this.setUrl = this.setUrl.bind(this);
    this.setFile = this.setFile.bind(this);
  }

  componentDidMount() {
    document.getElementById('url_input').style.display = 'none';
    document.getElementById('file_input').style.display = 'none';
    document.getElementById('submit_button').disabled = true;
  }

  handleSubmit(event) {
    let link_to_next_page = document.getElementById('movie_parser_link')
    if (this.state.image_or_movie === 'image') {
      link_to_next_page = document.getElementById('redactor_link')
    } 
    link_to_next_page.click()
  }

  toggleImageOrMovie(event) {
    let image_ele = document.getElementById('input_type_image')
    let movie_ele = document.getElementById('input_type_movie')
    let url_label_ele = document.getElementById('url_input_label')
    let file_label_ele = document.getElementById('file_input_label')
    let the_value = event.target.value

    if (the_value === 'image') {
      image_ele.checked = true;
      movie_ele.checked = false;
      url_label_ele.innerHTML = 'Image URL'
      file_label_ele.innerHTML = 'Image'
    } else {
      image_ele.checked = false;
      movie_ele.checked = true;
      url_label_ele.innerHTML = 'Movie URL'
      file_label_ele.innerHTML = 'Movie'
    }
    this.setState({
      image_or_movie: the_value,
    });
  }

  setUrl(event) {
    document.getElementById('submit_button').disabled = false;
    document.getElementById('submit_button').disabled = false;
    this.setState({
      asset_url: event.target.value,
      asset_file: '',
    })
  }

  setFile(event) {
    document.getElementById('submit_button').disabled = false;
    this.setState({
      asset_url: '',
      asset_file: event.target.value,
    })
  }

  toggleFileOrUrl(event) {
    let url_ele = document.getElementById('input_source_url')
    let file_ele = document.getElementById('input_source_file')
    let url_input_ele = document.getElementById('url_input')
    let file_input_ele = document.getElementById('file_input')
    let the_value = event.target.value;

    if (the_value === 'file') {
      url_ele.checked = false;
      file_ele.checked = true;
      url_input_ele.style.display = 'none';
      file_input_ele.style.display = 'block';
    } else {
      url_ele.checked = true;
      file_ele.checked = false;
      url_input_ele.style.display = 'block';
      file_input_ele.style.display = 'none';
    }

    this.setState({
      file_or_url: the_value,
    });
  }

  render() {
    return (
      <div className='col'>
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
        <div className="form-group">
          <h5>Input Source</h5>
          <div className='form-check'>
            <input className="form-check-input" type="radio"
                name="source_radio"
                id="input_source_url"
                value="url"
                onChange={this.toggleFileOrUrl} 
            />
            <label className="form-check-label" htmlFor="input_source_url" >
              Url
            </label>
          </div>
          <div className='form-check'>
            <input className="form-check-input" type="radio"
                name="source_radio"
                id="input_source_file"
                value="file"
                onChange={this.toggleFileOrUrl} 
            />
            <label className="form-check-label" htmlFor="input_source_file" >
              File Upload
            </label>
          </div>
        </div>
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
        <div className="form-group" id='file_input'>
          <label htmlFor="imageMovieFile" id='file_input_label'>Image or Movie</label>
          <input 
              type="file" 
              className="form-control-file" 
              id="imageMovieFile" 
              onChange={this.setFile}
          />
        </div>
        <button
            className='btn btn-primary'
            id='submit_button'
            onClick={this.handleSubmit}
        >
          Submit
        </button>
      </div>
    )
  }
}

export default HomePanel;
