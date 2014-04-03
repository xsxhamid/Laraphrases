<?php namespace Orkhan\Laraphrases\Facades;

use Illuminate\Support\Facades\Facade;

class Phrase extends Facade {

    /**
     * Get the registered name of the component.
     *
     * @return string
     */
    protected static function getFacadeAccessor() { return 'phrase'; }

}