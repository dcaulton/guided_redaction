import React from 'react'

class MovieCardList extends React.Component {
  buildMultiIdString() {
    let build_string = ''
    let mcw = document.getElementById('movie_card_wrapper')
    if (mcw) {
      const movie_cards = Array.from(mcw.children)
      movie_cards.forEach(el => {
        build_string += '#' + el.children[0].children[1].id + ','
      })
      build_string = build_string.substring(0, build_string.length-1)
    }
    return build_string
  }

  buildCollapseAllCardsLink() {
    let style = {
      'fontSize': 'small',
      'padding': 0,
    }
    const ids_to_collapse = this.buildMultiIdString() 
    return (
      <div
        className='d-inline'
      >
        <button
            style={style}
            className='btn btn-link'
            aria-expanded='false'
            data-target={ids_to_collapse}
            aria-controls={ids_to_collapse}
            data-toggle='collapse'
            type='button'
        >
          +/-
        </button>
      </div>
    )
  }

  render() {
    let cacl = this.buildCollapseAllCardsLink()
    return (
      <div>
        <div className='row'>
          <span className='h3 mr-5'>Videos</span>
          {cacl}
        </div>
        <div id='movie_card_wrapper'>
        {this.props.movie_urls.map((value, index) => {
          return (
          <MovieCard
              key={index}
              setCurrentVideo={this.props.setCurrentVideo}
              active_movie_url={this.props.movie_url}
              this_cards_movie_url={value}
              movies={this.props.movies}
              submitInsightsJob={this.props.submitInsightsJob}
              setMovieNickname={this.props.setMovieNickname}
              setDraggedId={this.props.setDraggedId}
              index={index}
              ocr_matches={this.props.ocr_matches}
              current_template_id={this.props.current_template_id}
              template_matches={this.props.template_matches}
              selected_areas={this.props.selected_areas}

          />
          )
        })}
        </div>
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

  buildNicknameBlock(movie_url, movies) {
    let return_arr = []
    if (Object.keys(movies).includes(movie_url)) {
      let nickname = movies[movie_url]['nickname']
      return_arr.push(
        <input
            className='nickname'
            key='1122'
            value={nickname}
            size='24'
            onChange={(event) => this.props.setMovieNickname(movie_url, event.target.value)}
        /> 
      )
    }
    return return_arr
  }

  buildMakeActiveButton(this_cards_movie_url) {
    let make_active_button = ''
    if (Object.keys(this.props.movies).includes(this_cards_movie_url)) {
      make_active_button = (
        <button
            className='btn btn-link'
            onClick={() => this.props.setCurrentVideo(this_cards_movie_url)}
        >
        load
        </button>
      )
    }
    if (this.props.this_cards_movie_url === this.props.active_movie_url) {
      make_active_button = (
        <button
            className='btn btn-link text-success'
            onClick={() => {}}
        >
        active
        </button>
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

  getMovieDimensions(movie_url, movies) {
    if (Object.keys(movies).includes(movie_url) && movies[movie_url]['frame_dimensions']) {
      const dims = movies[movie_url]['frame_dimensions']
      let ts = dims[0].toString() + 'x' + dims[1].toString()
      ts += ' - ' + movies[movie_url]['frameset_discriminator']
      return ts
    }
    return ''
  }

  buildMovieHeader(movie, movie_body_id, nickname_block) {
    let style = {
      'fontSize': 'small',
      'padding': 0,
    }
    return (
      <div
        className='d-inline'
      >
        {nickname_block}
        <button
            style={style}
            className='btn btn-link'
            aria-expanded='false'
            data-target={'#'+movie_body_id}
            aria-controls={movie_body_id}
            data-toggle='collapse'
            type='button'
        >
          +/-
        </button>
      </div>
    )

  }

  buildQueueJobLink() {
    return (
      <button
          className='btn btn-link'
          onClick={() => this.props.submitInsightsJob('load_movie', this.props.this_cards_movie_url)}
      >
      split
      </button>
    )
  }

  getSelectedAreasString() {
    if (Object.keys(this.props.selected_areas).includes(this.props.this_cards_movie_url)) {
      const  sa_count = Object.keys(this.props.selected_areas[this.props.this_cards_movie_url]).length
      const ret_str = sa_count.toString() + ' frameset w/selected areas'
      return ret_str
    }
    return ''
  } 

  getMovieDiffsFound() {
    if (Object.keys(this.props.movies).includes(this.props.this_cards_movie_url)) {
      for (let i=0; i < Object.keys(this.props.movies[this.props.this_cards_movie_url]['framesets']).length; i++) {
        const frameset_hash = Object.keys(this.props.movies[this.props.this_cards_movie_url]['framesets'])[i]
          const frameset = this.props.movies[this.props.this_cards_movie_url]['framesets'][frameset_hash]
          if (Object.keys(frameset).includes('filtered_image_url') &&
              frameset['filtered_image_url']) {
            return 'diff images exist'
          }
      }
    }
    return ''
  }

  getTemplateMatchesString() {
    if (!Object.keys(this.props.template_matches).includes(this.props.current_template_id)) {
      return ''
    }
    const cur_templates_matches = this.props.template_matches[this.props.current_template_id]
    if (!Object.keys(cur_templates_matches).includes(this.props.this_cards_movie_url)) {
      return ''
    }
    const cur_movies_matches = cur_templates_matches[this.props.this_cards_movie_url]
    let count = Object.keys(cur_movies_matches).length
    return count.toString() + ' template matches'
  }

  getOcrMatchesString() {
    if (Object.keys(this.props.ocr_matches).includes(this.props.this_cards_movie_url)) {
      let count = 0
      const ocr_matches_for_movie = this.props.ocr_matches[this.props.this_cards_movie_url]
      const frameset_hashes = Object.keys(ocr_matches_for_movie['framesets'])
      for (let i=0; i < frameset_hashes.length; i++) {
        if (ocr_matches_for_movie['framesets'][frameset_hashes[i]]['recognized_text_areas'].length > 0) {
          count += 1
        }
      }
      return (
        <div>
          {count} ocr matches
        </div>
      )
    }
    return ''
  }

  render() {
    let dd_style = {
      'fontSize': 'small',
    }

    let queue_job_button = this.buildQueueJobLink()
    let nickname_block = this.buildNicknameBlock(this.props.this_cards_movie_url, this.props.movies)
    if (!nickname_block.length) {
      nickname_block = this.getShortMovieData(this.props.this_cards_movie_url)
    }
    const framesets_count_message = this.getFramesetsCountMessage(this.props.this_cards_movie_url)
    const make_active_button = this.buildMakeActiveButton(this.props.this_cards_movie_url)
    const template_matches_string = this.getTemplateMatchesString()
    const ocr_matches_string = this.getOcrMatchesString()
    const diffs_string = this.getMovieDiffsFound()
    const selected_areas_string = this.getSelectedAreasString()
    const dims_string = this.getMovieDimensions(this.props.this_cards_movie_url, this.props.movies)
    let top_div_classname = "row mt-2 card"
    if (this.props.this_cards_movie_url === this.props.active_movie_url) {
      top_div_classname = "row mt-2 card active_movie_card"
    }
    const movie_body_id = 'movie_body_' + this.props.index
    const movie = this.props.movies[this.props.this_cards_movie_url]
    const movie_header = this.buildMovieHeader(movie, movie_body_id, nickname_block)

    return (
      <div 
          className={top_div_classname}
          draggable='true'
          onDragStart={() => this.props.setDraggedId(this.props.this_cards_movie_url)}
          onDragOver={(event) => event.preventDefault()}
      >
        <div className='col'>
            <div className='row' id='movie_header'>
              {movie_header}
            </div>

            <div 
              id={movie_body_id}
              className='collapse show'
            >

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
                {make_active_button}
                {queue_job_button}
              </div>

              <div 
                  className='row'
                  style={dd_style}
              >
                {framesets_count_message}
              </div>

              <div 
                  className='row'
                  style={dd_style}
              >
                {template_matches_string}
              </div>

              <div 
                  className='row'
                  style={dd_style}
              >
                {ocr_matches_string}
              </div>

              <div 
                  className='row'
                  style={dd_style}
              >
                {diffs_string}
              </div>

              <div 
                  className='row'
                  style={dd_style}
              >
                {selected_areas_string}
              </div>

              <div 
                  className='row ' 
                  style={dd_style}
              >
                {dims_string}
              </div>

            </div>

        </div>
      </div>
    )
  }
}

export default MovieCardList;
