import React from 'react';

class MovieUtils extends React.Component {

  static truncateAtFramesetHash(
      frameset_hash,
      getFramesetHashesInOrder,
      movie_url,
      movies,
      tier_1_matches,
      setGlobalStateVar
  ) {
    const hashes = getFramesetHashesInOrder()
    if (!hashes.includes(frameset_hash)) {
      return
    }
    const hash_ind = hashes.indexOf(frameset_hash)
    const trunc_hashes = hashes.slice(0, hash_ind)
    const hashes_to_delete = hashes.slice(hash_ind)

    let deepCopyMovies = JSON.parse(JSON.stringify(movies))
    let deepCopyMovie = JSON.parse(JSON.stringify(movies[movie_url]))
    if (!Object.keys(deepCopyMovie['framesets']).includes(frameset_hash)) {
      return
    }
    const movie = movies[movie_url]
    let build_frames = []
    let build_framesets = {}
    for (let i=0; i < trunc_hashes.length; i++) {
      const hash = trunc_hashes[i]
      const frameset = movie['framesets'][hash]
      build_framesets[hash] = frameset

      for (let j=0; j < frameset['images'].length; j++) {
        build_frames.push(frameset['images'][j])
      }
      build_frames.concat(frameset['images'])
    }
    build_frames.sort()

    deepCopyMovie['frames'] = build_frames
    deepCopyMovie['framesets'] = build_framesets
    deepCopyMovies[movie_url] = deepCopyMovie


    let deepCopyTier1Matches = JSON.parse(JSON.stringify(tier_1_matches))
    for (let i=0; i < Object.keys(tier_1_matches).length; i++) {
      const scanner_type = Object.keys(tier_1_matches)[i]
      for (let j=0; j < Object.keys(tier_1_matches[scanner_type]).length; j++) {
        const scanner_id = Object.keys(tier_1_matches[scanner_type])[j]
        const match_obj = tier_1_matches[scanner_type][scanner_id]
        if (
          Object.keys(match_obj).includes('movies') &&
          Object.keys(match_obj['movies']).includes(movie_url) &&
          Object.keys(match_obj['movies'][movie_url]).includes('framesets')
        ) {

          for (let k=0; k < hashes_to_delete.length; k++) {
            const fs_hash = hashes_to_delete[k]
            if (Object.keys(match_obj['movies'][movie_url]['framesets']).includes(fs_hash)) {
              delete deepCopyTier1Matches[scanner_type][scanner_id]['movies'][movie_url]['framesets'][fs_hash]
            }
          }
        }
      }
    }

    setGlobalStateVar({
      'movies': deepCopyMovies,
      'tier_1_matches': deepCopyTier1Matches,
    })
  }

  static removeFramesetHash(
      frameset_hash,
      movie_url, 
      movies,
      tier_1_matches,
      setGlobalStateVar
  ) {
    let deepCopyMovies = JSON.parse(JSON.stringify(movies))
    let deepCopyMovie = JSON.parse(JSON.stringify(movies[movie_url]))
    if (!Object.keys(deepCopyMovie['framesets']).includes(frameset_hash)) {
      return
    }
    const frameset = deepCopyMovie['framesets'][frameset_hash]
    let build_frames = []
    for (let i=0; i < deepCopyMovie['frames'].length; i++) {
      const frame_url = deepCopyMovie['frames'][i]
      if (!frameset['images'].includes(frame_url)) {
        build_frames.push(frame_url)
      }
    }
    deepCopyMovie['frames'] = build_frames
    delete deepCopyMovie['framesets'][frameset_hash]
    if (Object.keys(deepCopyMovie).includes('frameset_hashes_in_order')) {
      delete deepCopyMovie['frameset_hashes_in_order']
    }
    deepCopyMovies[movie_url] = deepCopyMovie


    let deepCopyTier1Matches = JSON.parse(JSON.stringify(tier_1_matches))
    for (let i=0; i < Object.keys(tier_1_matches).length; i++) {
      const scanner_type = Object.keys(tier_1_matches)[i]
      for (let j=0; j < Object.keys(tier_1_matches[scanner_type]).length; j++) {
        const scanner_id = Object.keys(tier_1_matches[scanner_type])[j]
        const match_obj = tier_1_matches[scanner_type][scanner_id]
        if (
          Object.keys(match_obj).includes('movies') &&
          Object.keys(match_obj['movies']).includes(movie_url) &&
          Object.keys(match_obj['movies'][movie_url]).includes('framesets') &&
          Object.keys(match_obj['movies'][movie_url]['framesets']).includes(frameset_hash) 
        ) {
          delete deepCopyTier1Matches[scanner_type][scanner_id]['movies'][movie_url]['framesets'][frameset_hash]
        }
      }
    }

    setGlobalStateVar({
      'movies': deepCopyMovies,
      'tier_1_matches': deepCopyTier1Matches,
    })

  }

  static establishNewEmptyMovie(
      new_movie_url='whatever', 
      make_active=true, 
      when_done=(()=>{}),
      setGlobalStateVar,
      movies,
      addToCampaignMovies
  ) {
    let new_movie = {
      frames: [],
      framesets: {},
    }
    let deepCopyMovies= JSON.parse(JSON.stringify(movies))
    deepCopyMovies[new_movie_url] = new_movie
    if (make_active) {
      setGlobalStateVar(
        {
          movie_url: new_movie_url,
          movies: deepCopyMovies,
        },
        (()=>{when_done(new_movie)})
      )
    } else {
      setGlobalStateVar(
        'movies', 
        deepCopyMovies, 
        (()=>{when_done(new_movie)})
      )
    }
    addToCampaignMovies([new_movie_url])
  }

  static clearCurrentFramesetChanges(
      when_done=(()=>{}),
      getFramesetHashForImageUrl,
      getImageUrl,
      movies, 
      movie_url,
      setGlobalStateVar
  ) {
    const the_hash = getFramesetHashForImageUrl(getImageUrl())
    let deepCopyMovies= JSON.parse(JSON.stringify(movies))
    if (Object.keys(deepCopyMovies).includes(movie_url)) {
      if (Object.keys(deepCopyMovies[movie_url]['framesets']).includes(the_hash)) {
        delete deepCopyMovies[movie_url]['framesets'][the_hash]['areas_to_redact']
        delete deepCopyMovies[movie_url]['framesets'][the_hash]['redacted_image']
        delete deepCopyMovies[movie_url]['framesets'][the_hash]['illustrated_image']
        deepCopyMovies[movie_url]['framesets'][the_hash]['areas_to_redact'] = []
        setGlobalStateVar('movies', deepCopyMovies)
      }
    }
  }

  static handleMergeFramesets(
      target_hash, 
      source_hash,
      getCurrentFramesets,
      movies,
      movie_url,
      setGlobalStateVar
  ) {
    let deepCopyFramesets = JSON.parse(JSON.stringify(getCurrentFramesets()))
    const source_frameset = deepCopyFramesets[source_hash]
    let new_target_frameset = deepCopyFramesets[target_hash]
    let new_target_images = new_target_frameset['images'].concat(source_frameset['images'])
    if (new_target_frameset['areas_to_redact']) {
      if (source_frameset['areas_to_redact']) {
        let new_a2r = new_target_frameset['areas_to_redact'].concat(source_frameset['areas_to_redact'])
        new_target_frameset['areas_to_redact'] = new_a2r
      }
    } else if (source_frameset['areas_to_redact']) {
      new_target_frameset['areas_to_redact'] = source_frameset['areas_to_redact']
    }
    new_target_frameset['images'] = new_target_images
    deepCopyFramesets[target_hash] = new_target_frameset
    delete deepCopyFramesets[source_hash]
    let deepCopyMovies = JSON.parse(JSON.stringify(movies))
    let cur_movie = deepCopyMovies[movie_url]
    cur_movie['framesets'] = deepCopyFramesets
    deepCopyMovies[movie_url] = cur_movie
    setGlobalStateVar('movies', deepCopyMovies)
  }


  static clearCurrentIllustrations(
      movie_url,
      movies,
      setGlobalStateVar
  ) {
    if (!movie_url || !movies) {
      return
    }
    let deepCopyMovies = JSON.parse(JSON.stringify(movies))
    let deepCopyMovie = JSON.parse(JSON.stringify(movies[movie_url]))

    for (let i=0; i < Object.keys(deepCopyMovie.framesets).length; i++) {
      const frameset_hash = Object.keys(deepCopyMovie.framesets)[i]
      if (Object.keys(deepCopyMovie.framesets[frameset_hash]).includes('illustrated_image')) {
        delete deepCopyMovie.framesets[frameset_hash].illustrated_image
      }
    }
    deepCopyMovies[movie_url] = deepCopyMovie
    setGlobalStateVar('movies', deepCopyMovies)
  }

  clearCurrentRedactions(
      movie_url,
      movies,
      setGlobalStateVar
  ) {
    if (!movie_url || !movies) {
      return
    }
    let deepCopyMovies = JSON.parse(JSON.stringify(movies))
    let deepCopyMovie = JSON.parse(JSON.stringify(movies[movie_url]))

    for (let i=0; i < Object.keys(deepCopyMovie.framesets).length; i++) {
      const frameset_hash = Object.keys(deepCopyMovie.framesets)[i]
      if (Object.keys(deepCopyMovie.framesets[frameset_hash]).includes('redacted_image')) {
        delete deepCopyMovie.framesets[frameset_hash].redacted_image
      }
      if (Object.keys(deepCopyMovie.framesets[frameset_hash]).includes('areas_to_redact')) {
        delete deepCopyMovie.framesets[frameset_hash].areas_to_redact
      }
    }
    deepCopyMovies[movie_url] = deepCopyMovie
    setGlobalStateVar('movies', deepCopyMovies)
  }
















}

export default MovieUtils;
