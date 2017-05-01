class SM.Store

  # manages locally stored items through store.js
  # https://github.com/marcuswestin/store.js/

  constructor: () ->
    @this = this
    @prefix = "SM://"
    @numListViewsToStore = 1
    @numObjectsToStore = 10
    @bind()
    @attemptMade = false
    @lastListViewModel
    @lastListViewData

  bind: =>
    $(document).ready =>
      @storeObject(SM.currentObject) if SM.currentObject

    $(document.body).on SM.events.click, '#user-menu-clear-cache', (e) =>
      e.preventDefault()
      SM.message.showConfirm("Clear locally stored data?", @clearConfirmed, @clearCancelled)

  clearConfirmed: =>
    store.clear()
    SM.menu.doClose()

  clearCancelled: =>
    SM.menu.doClose()

  set: (name, value) =>
    store.set(@prefix + name, value)

  get: (name) =>
    store.get(@prefix + name)

  attemptingListView: (model,data) =>
    @lastListViewModel = model
    @lastListViewData = data
    @attemptMade = true

  successfulListView: (results) =>
    if @attemptMade
      if @lastListViewData.split("&search=")[1]!=''
        @storeListView(@lastListViewModel,@lastListViewData,results)
      SM.savedViews.viewChanged()
      @attemptMade = false
    return true

  storeListView: (model,data,results) =>
    key = "listview/#{model}"
    val = {model:model,data:data,results:results,dt:new Date()}
    arr = @get(key)
    arr = [] if (!arr)
    arr = @updateArray(arr, val, @numListViewsToStore)
    @set(key,arr)
    return

  getListViews: (model) =>
    key = "listview/#{model}"
    return @get(key)

  storeObject: (data) =>
    return if (SM.currentAccount.settings.no_recents_on_ios && SM.ios)

    standardised = SM.standardise(Object.keys(data)[0])
    pluralised = SM.pluralise("",standardised)

    key = "object/#{pluralised}"
    val = {data:data,dt:new Date()}
    arr = @get(key)
    arr = [] if (!arr)
    arr = @updateArray(arr, val, @numObjectsToStore)
    @set(key,arr)
    return

  getObjects: (model) =>
    key = "object/#{model}"
    return @get(key)

  clearObjects: (model) =>
    key = "object/#{model}"
    @set(key,"")

  updateArray: (arr, val, size) =>
    for i, index in arr
      if typeof(val.data) is "object" && typeof(i.data) is "object"
        if i.data[Object.keys(i.data)[0]].id is val.data[Object.keys(val.data)[0]].id
          i.data = $.extend(true, {}, val.data);
          arr.splice(index,1)
          break
      else
        if i.data == val.data
          i.data = val.data
          arr.splice(index,1)
          break
    arr.unshift(val)
    arr = arr.slice(0,size)
    return arr
