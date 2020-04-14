import React from 'react';
import {
  makeHeaderRow,
} from './SharedControls'

class MovieSetsControls extends React.Component {
  constructor(props) {
    super(props)
    this.state = ({
      movie_set_name: 'movie set 1',
      movie_set_movies: [],
      movie_set_id: '',
    })
  }

  doMovieSetSave() {
    let deepCopyMovieSets = JSON.parse(JSON.stringify(this.props.movie_sets))   
    let movie_set = {}
    let ms_keys = Object.keys(deepCopyMovieSets)
    for (let i=0; i< ms_keys.length; i++) {
      let temp_movie_set = deepCopyMovieSets[ms_keys[i]]
      if (temp_movie_set['name'] === this.state.movie_set_name) {
        movie_set = temp_movie_set
      }
    }
    movie_set['movies'] = this.state.movie_set_movies
    movie_set['name'] = this.state.movie_set_name
    let movie_set_id  = 'movie_set_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    if (Object.keys(this.props.movie_sets).includes(this.state.movie_set_id)) {
      movie_set_id = this.state.movie_set_id
    }
    deepCopyMovieSets[movie_set_id] = movie_set
    this.props.setGlobalStateVar('movie_sets', deepCopyMovieSets)
    this.props.displayInsightsMessage('movie set saved')
  }

  setMovieSetName(the_name) {
    this.setState({
      movie_set_name: the_name,
    })
  }

  loadNewMovieSet() {
    this.setState({
      movie_set_name: 'movie set 1',
      movie_set_movies: [],
      movie_set_id: '',
    })
  }

  doMovieSetClear() {
    this.setState({
      movie_set_movies: [],
    })
  }

  doMovieSetLoad(movie_set_id) {
    const movie_set = this.props.movie_sets[movie_set_id]
    this.setState({
      movie_set_name: movie_set['name'],
      movie_set_movies: movie_set['movies'],
      movie_set_id: movie_set_id,
    })
    this.props.displayInsightsMessage('movie set loaded')
  }

  buildMovieSetPickerButton() {
    let return_array = []
    const movie_set_keys = Object.keys(this.props.movie_sets)
    return_array.push(
      <div key='x34' className='d-inline'>
      <button
          key='temp_names_button'
          className='btn btn-primary ml-2 mt-2 dropdown-toggle'
          type='button'
          id='loadTemplateDropdownButton'
          data-toggle='dropdown'
          area-haspopup='true'
          area-expanded='false'
      >
        Load Movie Set
      </button>
      <div className='dropdown-menu' aria-labelledby='loadTemplateDropdownButton'>
    {movie_set_keys.map((value, index) => {
      return (
        <button
            className='dropdown-item'
            key={index}
            onClick={() => this.doMovieSetLoad(value)}
        >
          {this.props.movie_sets[value]['name']}
        </button>
      )
    })}
        <button
            className='dropdown-item'
            key='000'
            onClick={() => this.loadNewMovieSet()}
        >
          new
        </button>
      </div>
      </div>
    )
    return return_array
  }

  handleDroppedMovieLocal() {
    if (!this.state.movie_set_movies.includes(this.props.draggedId)) {
      let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movie_set_movies))   
      deepCopyMovies.push(this.props.draggedId)
      this.setState({
        movie_set_movies: deepCopyMovies,
      })
    }
  }

  buildMovieSetMoviesList() {
    return (
      <div 
          className='d-inline '
          key='9090'
      >
        <div 
            className='border border-2'
            draggable='true'
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => this.handleDroppedMovieLocal()}
        >
          <h5>drag movies to this box to add them</h5>
          <ul>
          {this.state.movie_set_movies.map((value, index) => {
            return (
              <li key={index} >
                {[value]}
              </li>
            )
          })}
          </ul>
        </div>
      </div>
    )
  }

  render() {
    const ms_load_button = this.buildMovieSetPickerButton()
    const ms_movies = this.buildMovieSetMoviesList()

    if (!this.props.visibilityFlags['movieSets']) {
      return([])
    }
    const header_row = makeHeaderRow(
      'movie sets',
      'movie_sets_body',
      (() => this.props.toggleShowVisibility('movieSets'))
    )

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='movie_sets_body' 
                className='row collapse'
            >
              <div id='results_main' className='col'>

                <div className='row mt-3 bg-light'>
                  <div
                      className='d-inline ml-2 mt-2'
                  >   
                    {ms_load_button}
                  </div>
                
                  <div
                      className='d-inline ml-2 mt-2'
                  >   
                      <input 
                          id='movie_set_name'
                          size='30'
                          title='movie set name'
                          value={this.state.movie_set_name}
                          onChange={(event) => this.setMovieSetName(event.target.value)}
                      />

                    <button
                        className='btn btn-primary m-2'
                        onClick={() => this.doMovieSetClear()}
                    >
                      Clear
                    </button>

                    <button
                        className='btn btn-primary m-2'
                        onClick={() => this.doMovieSetSave()}
                    >
                      Save
                    </button>

                    {ms_movies}


                  </div>


                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default MovieSetsControls;
