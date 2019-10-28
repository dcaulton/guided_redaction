import React from 'react';

class HomePanel extends React.Component {

  render() {
    return (
      <div id='home_panel'>
        <div classname='col md-6'>
          <div className='row mt-5'>
            <p>To start work you will need to specify a movie or image.  Please use is form to either upload one or indicate the url where the asset can be accessed.</p>
            <p>After you have specified the input image or movie, press the Movie Parser link above if it's a movie, otherwise press the Image Redactor link above</p>
          </div>
          <hr />
          <div className='row'>
            <form>
              <div class="form-group">
                <label for="imageMovieUrl">Image/Movie URL</label>
                <input type="text" class="form-control" size='90' id="imageMovieUrl" />
              </div>
              <div className="form-group">
                <label for="imageMovieFile">Image or Movie</label>
                <input type="file" className="form-control-file" id="imageMovieFile" />
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }
}

export default HomePanel;
