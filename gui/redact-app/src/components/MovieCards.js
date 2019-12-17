import React from 'react'

class MovieCardList extends React.Component {
  render() {
    return (
      <div>
        <div className='row'>
          <h3>Videos</h3>
        </div>
      {this.props.movie_urls.map((value, index) => {
        return (
        <MovieCard
            key={index}
            setCurrentVideo={this.props.setCurrentVideo}
            active_movie_url={this.props.movie_url}
            this_cards_movie_url={value}
            movies={this.props.movies}
            getMovieMatchesFound={this.props.getMovieMatchesFound}
            getMovieSelectedCount={this.props.getMovieSelectedCount}
            submitInsightsJob={this.props.submitInsightsJob}
        />
        )
      })}
      </div>
    )
  }
}

class MovieCard extends React.Component {
  get_filename(the_url) {
    const parts = the_url.split('/')
    return parts[parts.length-1]
  }

  getShortMovieData(this_cards_movie_url) {
    const mn_length = this.get_filename(this_cards_movie_url).length
    let short_movie_name = this.get_filename(this_cards_movie_url)
    if (short_movie_name.length > 12) {
      short_movie_name = this.get_filename(this_cards_movie_url).substring(0, 4) + '...' + 
        this.get_filename(this_cards_movie_url).substring(mn_length-7)
    }
    let short_movie_data = (
      <span title={this.get_filename(this_cards_movie_url)}>
        {short_movie_name}
      </span>
    )
    return short_movie_data
  }

  buildMakeActiveButton(this_cards_movie_url, active_status) {
    let make_active_button = (
        <button
            className='btn btn-link'
            onClick={() => this.props.setCurrentVideo(this_cards_movie_url)}
        >
        load
        </button>
    )
    if (active_status) {
      make_active_button = (
        <div
          className='row text-success'
        >
          active
        </div>
      )
    }
    return make_active_button
  }

  getFramesetsCountMessage(this_cards_movie_url) {
    let framesets_count_message = 'no framesets'
    if (Object.keys(this.props.movies).includes(this_cards_movie_url)) {
      let the_framesets = this.props.movies[this_cards_movie_url]['framesets']
      framesets_count_message = Object.keys(the_framesets).length.toString() + ' framesets'
    }
    return framesets_count_message
  }

  render() {
    let active_status = false
    if (this.props.this_cards_movie_url === this.props.active_movie_url) {
      active_status = true
    } 

    let load_as_job_button = (
        <button
            className='btn btn-link'
            onClick={() => this.props.submitInsightsJob('load_movie', this.props.this_cards_movie_url)}
        >
        queue
        </button>
    )

    const framesets_count_message = this.getFramesetsCountMessage(this.props.this_cards_movie_url)
    const make_active_button = this.buildMakeActiveButton(this.props.this_cards_movie_url, active_status)
    const short_movie_data = this.getShortMovieData(this.props.this_cards_movie_url)
    const found_string = this.props.getMovieMatchesFound(this.props.this_cards_movie_url)
    const selected_string = this.props.getMovieSelectedCount(this.props.this_cards_movie_url)
    let top_div_classname = "row mt-4 card"
    if (active_status) {
      top_div_classname = "row mt-4 card active_movie_card"
    }

    return (
      <div className={top_div_classname}>
        <div className='col'>
            <div className='row'>
              <video 
                  id='video_{this.props.key}' 
                  controls 
              >
                <source
                  src={this.props.this_cards_movie_url}
                  type='video/mp4'
                />
              </video>
            </div>
          <div className='row'>
          {short_movie_data}
          </div>
          <div className='row'>
            {make_active_button}
            {load_as_job_button}
          </div>
          <div className='row'>
            {framesets_count_message}
          </div>
          <div className='row'>
            {found_string}
          </div>
          <div className='row'>
            {selected_string}
          </div>
        </div>
      </div>
    )
  }
}

export default MovieCardList;
